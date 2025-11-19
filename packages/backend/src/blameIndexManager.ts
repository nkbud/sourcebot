import * as Sentry from '@sentry/node';
import { PrismaClient, Repo } from "@sourcebot/db";
import { createLogger, Logger } from "@sourcebot/shared";
import { env } from '@sourcebot/shared';
import { existsSync } from 'fs';
import { Job, Queue, ReservedJob, Worker } from "groupmq";
import { Redis } from 'ioredis';
import { GROUPMQ_WORKER_STOP_GRACEFUL_TIMEOUT_MS } from './constants.js';
import { getCommitHashForRefName } from './git.js';
import { RepoWithConnections, Settings } from "./types.js";
import { getRepoPath, groupmqLifecycleExceptionWrapper, measure } from './utils.js';
import { simpleGit } from 'simple-git';

const LOG_TAG = 'blame-index-manager';
const logger = createLogger(LOG_TAG);
const createJobLogger = (jobId: string) => createLogger(`${LOG_TAG}:job:${jobId}`);

type BlameScanJobPayload = {
    type: 'SCAN';
    jobId: string;
    repoId: number;
    repoName: string;
};

type FileBlameUpdateJobPayload = {
    type: 'FILE_UPDATE';
    jobId: string;
    repoName: string;
    repoPath: string;
    filePath: string;
    commitHash: string;
};

type BlameCommitJobPayload = {
    type: 'COMMIT';
    jobId: string;
    repoName: string;
    repoPath: string;
    commitHash: string;
};

type BlameJobPayload = BlameScanJobPayload | FileBlameUpdateJobPayload | BlameCommitJobPayload;

/**
 * Manages the Git Blame bidirectional indexing subsystem.
 * Produces and maintains two query-ready indexes:
 * - Author → Filepaths: "What files has this author touched?"
 * - Filepath → Authors: "Which authors have touched this file?"
 * 
 * Uses three types of workers:
 * 1. BlameScanner: Determines changed files and queues file updates
 * 2. IndexWorker: Computes blame diff per file and updates indexes
 * 3. StatusUpdater: Updates repository sync state
 */
export class BlameIndexManager {
    private scanQueue: Queue<BlameScanJobPayload>;
    private fileUpdateQueue: Queue<FileBlameUpdateJobPayload>;
    private commitQueue: Queue<BlameCommitJobPayload>;
    
    private scanWorker: Worker<BlameScanJobPayload>;
    private fileUpdateWorker: Worker<FileBlameUpdateJobPayload>;
    private commitWorker: Worker<BlameCommitJobPayload>;

    constructor(
        private db: PrismaClient,
        private settings: Settings,
        private redis: Redis,
    ) {
        // Queue for scanning repos and identifying changed files
        this.scanQueue = new Queue<BlameScanJobPayload>({
            redis,
            namespace: 'repo-blame-scan',
            jobTimeoutMs: this.settings.repoIndexTimeoutMs,
            maxAttempts: 3,
            logger: env.DEBUG_ENABLE_GROUPMQ_LOGGING === 'true',
        });

        // Queue for updating blame data for individual files
        this.fileUpdateQueue = new Queue<FileBlameUpdateJobPayload>({
            redis,
            namespace: 'file-blame-update',
            jobTimeoutMs: 60000, // 1 minute per file
            maxAttempts: 3,
            logger: env.DEBUG_ENABLE_GROUPMQ_LOGGING === 'true',
        });

        // Queue for committing blame sync state
        this.commitQueue = new Queue<BlameCommitJobPayload>({
            redis,
            namespace: 'repo-blame-commit',
            jobTimeoutMs: 30000, // 30 seconds
            maxAttempts: 3,
            logger: env.DEBUG_ENABLE_GROUPMQ_LOGGING === 'true',
        });

        // Worker for scanning repos
        this.scanWorker = new Worker<BlameScanJobPayload>({
            queue: this.scanQueue,
            maxStalledCount: 1,
            handler: this.runScanJob.bind(this),
            concurrency: 2,
            ...(env.DEBUG_ENABLE_GROUPMQ_LOGGING === 'true' ? {
                logger: true,
            } : {}),
        });

        // Worker for updating individual files
        this.fileUpdateWorker = new Worker<FileBlameUpdateJobPayload>({
            queue: this.fileUpdateQueue,
            maxStalledCount: 1,
            handler: this.runFileUpdateJob.bind(this),
            concurrency: 5,
            ...(env.DEBUG_ENABLE_GROUPMQ_LOGGING === 'true' ? {
                logger: true,
            } : {}),
        });

        // Worker for committing sync state
        this.commitWorker = new Worker<BlameCommitJobPayload>({
            queue: this.commitQueue,
            maxStalledCount: 1,
            handler: this.runCommitJob.bind(this),
            concurrency: 2,
            ...(env.DEBUG_ENABLE_GROUPMQ_LOGGING === 'true' ? {
                logger: true,
            } : {}),
        });

        // Set up event handlers
        this.scanWorker.on('completed', this.onScanJobCompleted.bind(this));
        this.scanWorker.on('failed', this.onScanJobFailed.bind(this));
        this.scanWorker.on('stalled', this.onScanJobStalled.bind(this));
        this.scanWorker.on('error', this.onWorkerError.bind(this));
        this.scanWorker.on('graceful-timeout', this.onScanJobGracefulTimeout.bind(this));

        this.fileUpdateWorker.on('completed', this.onFileUpdateJobCompleted.bind(this));
        this.fileUpdateWorker.on('failed', this.onFileUpdateJobFailed.bind(this));
        this.fileUpdateWorker.on('stalled', this.onFileUpdateJobStalled.bind(this));
        this.fileUpdateWorker.on('error', this.onWorkerError.bind(this));
        this.fileUpdateWorker.on('graceful-timeout', this.onFileUpdateJobGracefulTimeout.bind(this));

        this.commitWorker.on('completed', this.onCommitJobCompleted.bind(this));
        this.commitWorker.on('failed', this.onCommitJobFailed.bind(this));
        this.commitWorker.on('stalled', this.onCommitJobStalled.bind(this));
        this.commitWorker.on('error', this.onWorkerError.bind(this));
        this.commitWorker.on('graceful-timeout', this.onCommitJobGracefulTimeout.bind(this));
    }

    public async start() {
        logger.debug('Starting blame index workers');
        this.scanWorker.run();
        this.fileUpdateWorker.run();
        this.commitWorker.run();
    }

    public async stop() {
        logger.debug('Stopping blame index workers');
        await Promise.all([
            this.scanWorker.close(GROUPMQ_WORKER_STOP_GRACEFUL_TIMEOUT_MS),
            this.fileUpdateWorker.close(GROUPMQ_WORKER_STOP_GRACEFUL_TIMEOUT_MS),
            this.commitWorker.close(GROUPMQ_WORKER_STOP_GRACEFUL_TIMEOUT_MS),
        ]);
    }

    /**
     * Queue a blame scan for a repository after it has been indexed
     */
    public async queueBlameScan(repo: Repo) {
        const jobId = `blame-scan-${repo.id}-${Date.now()}`;
        await this.scanQueue.add({
            groupId: `repo:${repo.id}`,
            data: {
                type: 'SCAN',
                jobId,
                repoName: repo.name,
                repoId: repo.id,
            },
            jobId,
        });
        logger.info(`Queued blame scan for repo ${repo.name} (id: ${repo.id})`);
    }

    /**
     * BlameScanner: Determines which files have changed since last sync
     * and queues file-blame-update jobs for each changed file
     */
    private async runScanJob(job: ReservedJob<BlameScanJobPayload>) {
        const { jobId, repoName, repoId } = job.data;
        const logger = createJobLogger(jobId);
        
        logger.info(`Running blame scan for repo ${repoName} (id: ${repoId})`);

        const repo = await this.db.repo.findUnique({
            where: { id: repoId },
        });

        if (!repo) {
            logger.warn(`Repo ${repoId} not found, skipping blame scan`);
            return;
        }

        const { path: repoPath } = getRepoPath(repo);

        if (!existsSync(repoPath)) {
            logger.warn(`Repo path ${repoPath} does not exist, skipping blame scan`);
            return;
        }

        // Get current HEAD commit
        const currentHash = await getCommitHashForRefName({
            path: repoPath,
            refName: 'HEAD',
        });

        if (!currentHash) {
            logger.warn(`Could not get HEAD commit for ${repoPath}, skipping blame scan`);
            return;
        }

        // Get or create blame state
        let blameState = await this.db.repoBlameState.findUnique({
            where: { repoPath: repo.name },
        });

        if (!blameState) {
            blameState = await this.db.repoBlameState.create({
                data: {
                    repoPath: repo.name,
                    lastSyncedHash: null,
                },
            });
        }

        // Get list of changed files
        const changedFiles = await this.getChangedFiles(
            repoPath,
            blameState.lastSyncedHash,
            currentHash,
            logger
        );

        logger.info(`Found ${changedFiles.length} changed files in ${repoName}`);

        // Queue file update jobs for each changed file
        for (const filePath of changedFiles) {
            const fileJobId = `file-blame-${repoId}-${Date.now()}-${filePath.replace(/\//g, '-')}`;
            await this.fileUpdateQueue.add({
                groupId: `repo:${repoId}`,
                data: {
                    type: 'FILE_UPDATE',
                    jobId: fileJobId,
                    repoName: repo.name,
                    repoPath: repo.name,
                    filePath,
                    commitHash: currentHash,
                },
                jobId: fileJobId,
            });
        }

        // Queue commit job to update sync state
        const commitJobId = `blame-commit-${repoId}-${Date.now()}`;
        await this.commitQueue.add({
            groupId: `repo:${repoId}`,
            data: {
                type: 'COMMIT',
                jobId: commitJobId,
                repoName: repo.name,
                repoPath: repo.name,
                commitHash: currentHash,
            },
            jobId: commitJobId,
        });

        logger.info(`Completed blame scan for ${repoName}, queued ${changedFiles.length} file updates`);
    }

    /**
     * Get list of files that have changed between two commits
     */
    private async getChangedFiles(
        repoPath: string,
        fromHash: string | null,
        toHash: string,
        logger: Logger
    ): Promise<string[]> {
        try {
            const git = simpleGit(repoPath);

            if (!fromHash) {
                // First sync - get all files in the repository
                logger.info('First sync - getting all files in repository');
                const files = await git.raw(['ls-tree', '-r', '--name-only', toHash]);
                return files.split('\n').filter(f => f.trim().length > 0);
            }

            // Get files changed between commits
            const diff = await git.raw([
                'diff',
                '--name-only',
                fromHash,
                toHash
            ]);

            return diff.split('\n').filter(f => f.trim().length > 0);
        } catch (error: unknown) {
            logger.error('Error getting changed files:', error);
            throw error;
        }
    }

    /**
     * IndexWorker: Computes blame for a file and updates both indexes atomically
     */
    private async runFileUpdateJob(job: ReservedJob<FileBlameUpdateJobPayload>) {
        const { jobId, repoName, repoPath, filePath, commitHash } = job.data;
        const logger = createJobLogger(jobId);

        logger.info(`Updating blame index for ${filePath} in ${repoName}`);

        const fullRepoPath = getRepoPath({ name: repoName } as Repo).path;

        if (!existsSync(fullRepoPath)) {
            logger.warn(`Repo path ${fullRepoPath} does not exist, skipping file update`);
            return;
        }

        try {
            // Get blame information for the file
            const authors = await this.getBlameAuthors(fullRepoPath, filePath, commitHash, logger);

            if (authors.length === 0) {
                logger.debug(`No authors found for ${filePath}, file may be deleted`);
                // File was deleted, remove it from indexes
                await this.removeFileFromIndexes(repoName, filePath, logger);
                return;
            }

            // Update indexes atomically
            await this.updateIndexesForFile(repoName, filePath, authors, logger);

            logger.info(`Updated blame index for ${filePath} with ${authors.length} unique authors`);
        } catch (error: unknown) {
            logger.error(`Error updating blame for ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Get unique authors who have contributed to a file
     */
    private async getBlameAuthors(
        repoPath: string,
        filePath: string,
        commitHash: string,
        logger: Logger
    ): Promise<string[]> {
        try {
            const git = simpleGit(repoPath);

            // Check if file exists in the commit
            try {
                await git.raw(['cat-file', '-e', `${commitHash}:${filePath}`]);
            } catch {
                // File doesn't exist in this commit (deleted)
                return [];
            }

            // Run git blame to get authors
            const blameOutput = await git.raw([
                'blame',
                '--line-porcelain',
                commitHash,
                '--',
                filePath
            ]);

            // Parse blame output to extract unique author emails
            const authorEmails = new Set<string>();
            const lines = blameOutput.split('\n');

            for (const line of lines) {
                if (line.startsWith('author-mail ')) {
                    // Format is "author-mail <email@example.com>"
                    const email = line.substring('author-mail '.length).replace(/^<|>$/g, '');
                    if (email && email.length > 0) {
                        authorEmails.add(email);
                    }
                }
            }

            return Array.from(authorEmails);
        } catch (error: unknown) {
            logger.error(`Error getting blame for ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Remove a file from both indexes (e.g., when deleted)
     */
    private async removeFileFromIndexes(
        repoName: string,
        filePath: string,
        logger: Logger
    ) {
        const globalFilepath = `${repoName}/${filePath}`;

        await this.db.$transaction(async (tx) => {
            // Delete from both indexes
            await tx.authorToFilepath.deleteMany({
                where: { globalFilepath },
            });

            await tx.filepathToAuthor.deleteMany({
                where: { globalFilepath },
            });
        });

        logger.debug(`Removed ${globalFilepath} from blame indexes`);
    }

    /**
     * Update both indexes for a file atomically
     */
    private async updateIndexesForFile(
        repoName: string,
        filePath: string,
        authors: string[],
        logger: Logger
    ) {
        const globalFilepath = `${repoName}/${filePath}`;

        await this.db.$transaction(async (tx) => {
            // First, remove old entries for this file
            await tx.authorToFilepath.deleteMany({
                where: { globalFilepath },
            });

            await tx.filepathToAuthor.deleteMany({
                where: { globalFilepath },
            });

            // Then, insert new entries
            for (const authorEmail of authors) {
                // Author -> Filepath
                await tx.authorToFilepath.create({
                    data: {
                        authorEmail,
                        globalFilepath,
                    },
                });

                // Filepath -> Author
                await tx.filepathToAuthor.create({
                    data: {
                        globalFilepath,
                        authorEmail,
                    },
                });
            }
        });

        logger.debug(`Updated indexes for ${globalFilepath} with ${authors.length} authors`);
    }

    /**
     * StatusUpdater: Updates the last synced hash for a repository
     */
    private async runCommitJob(job: ReservedJob<BlameCommitJobPayload>) {
        const { jobId, repoName, repoPath, commitHash } = job.data;
        const logger = createJobLogger(jobId);

        logger.info(`Updating blame sync state for ${repoName} to ${commitHash}`);

        await this.db.repoBlameState.upsert({
            where: { repoPath },
            create: {
                repoPath,
                lastSyncedHash: commitHash,
            },
            update: {
                lastSyncedHash: commitHash,
            },
        });

        logger.info(`Updated blame sync state for ${repoName}`);
    }

    // Event handlers
    private onScanJobCompleted = async (job: Job<BlameScanJobPayload>) =>
        groupmqLifecycleExceptionWrapper('onScanJobCompleted', logger, async () => {
            const jobLogger = createJobLogger(job.data.jobId);
            jobLogger.info(`Completed blame scan job ${job.data.jobId} for repo ${job.data.repoName}`);
        });

    private onScanJobFailed = async (job: Job<BlameScanJobPayload>) =>
        groupmqLifecycleExceptionWrapper('onScanJobFailed', logger, async () => {
            const jobLogger = createJobLogger(job.data.jobId);
            jobLogger.error(`Scan job ${job.data.jobId} failed: ${job.failedReason}`);
            Sentry.captureException(new Error(job.failedReason || 'Unknown error'), {
                tags: {
                    jobId: job.data.jobId,
                    jobType: 'SCAN',
                },
            });
        });

    private onScanJobStalled = async (jobId: string) =>
        groupmqLifecycleExceptionWrapper('onScanJobStalled', logger, async () => {
            const jobLogger = createJobLogger(jobId);
            jobLogger.warn(`Scan job ${jobId} stalled`);
        });

    private onScanJobGracefulTimeout = async (job: Job<BlameScanJobPayload>) =>
        groupmqLifecycleExceptionWrapper('onScanJobGracefulTimeout', logger, async () => {
            const jobLogger = createJobLogger(job.data.jobId);
            jobLogger.error(`Scan job ${job.data.jobId} graceful timeout exceeded`);
        });

    private onFileUpdateJobCompleted = async (job: Job<FileBlameUpdateJobPayload>) =>
        groupmqLifecycleExceptionWrapper('onFileUpdateJobCompleted', logger, async () => {
            const jobLogger = createJobLogger(job.data.jobId);
            jobLogger.debug(`Completed file blame update job ${job.data.jobId} for ${job.data.filePath}`);
        });

    private onFileUpdateJobFailed = async (job: Job<FileBlameUpdateJobPayload>) =>
        groupmqLifecycleExceptionWrapper('onFileUpdateJobFailed', logger, async () => {
            const jobLogger = createJobLogger(job.data.jobId);
            jobLogger.error(`File update job ${job.data.jobId} failed: ${job.failedReason}`);
            Sentry.captureException(new Error(job.failedReason || 'Unknown error'), {
                tags: {
                    jobId: job.data.jobId,
                    jobType: 'FILE_UPDATE',
                },
            });
        });

    private onFileUpdateJobStalled = async (jobId: string) =>
        groupmqLifecycleExceptionWrapper('onFileUpdateJobStalled', logger, async () => {
            const jobLogger = createJobLogger(jobId);
            jobLogger.warn(`File update job ${jobId} stalled`);
        });

    private onFileUpdateJobGracefulTimeout = async (job: Job<FileBlameUpdateJobPayload>) =>
        groupmqLifecycleExceptionWrapper('onFileUpdateJobGracefulTimeout', logger, async () => {
            const jobLogger = createJobLogger(job.data.jobId);
            jobLogger.error(`File update job ${job.data.jobId} graceful timeout exceeded`);
        });

    private onCommitJobCompleted = async (job: Job<BlameCommitJobPayload>) =>
        groupmqLifecycleExceptionWrapper('onCommitJobCompleted', logger, async () => {
            const jobLogger = createJobLogger(job.data.jobId);
            jobLogger.info(`Completed blame commit job ${job.data.jobId} for repo ${job.data.repoName}`);
        });

    private onCommitJobFailed = async (job: Job<BlameCommitJobPayload>) =>
        groupmqLifecycleExceptionWrapper('onCommitJobFailed', logger, async () => {
            const jobLogger = createJobLogger(job.data.jobId);
            jobLogger.error(`Commit job ${job.data.jobId} failed: ${job.failedReason}`);
            Sentry.captureException(new Error(job.failedReason || 'Unknown error'), {
                tags: {
                    jobId: job.data.jobId,
                    jobType: 'COMMIT',
                },
            });
        });

    private onCommitJobStalled = async (jobId: string) =>
        groupmqLifecycleExceptionWrapper('onCommitJobStalled', logger, async () => {
            const jobLogger = createJobLogger(jobId);
            jobLogger.warn(`Commit job ${jobId} stalled`);
        });

    private onCommitJobGracefulTimeout = async (job: Job<BlameCommitJobPayload>) =>
        groupmqLifecycleExceptionWrapper('onCommitJobGracefulTimeout', logger, async () => {
            const jobLogger = createJobLogger(job.data.jobId);
            jobLogger.error(`Commit job ${job.data.jobId} graceful timeout exceeded`);
        });

    private onWorkerError = async (error: Error) => {
        logger.error('Worker error:', error);
        Sentry.captureException(error, {
            tags: {
                component: 'blame-index-worker',
            },
        });
    };
}
