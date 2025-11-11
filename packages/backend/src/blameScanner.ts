import { Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { createLogger } from "@sourcebot/logger";
import { PrismaClient } from "@sourcebot/db";
import { AppContext, Settings } from "./types.js";
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { simpleGit } from 'simple-git';
import * as Sentry from "@sentry/node";
import { env } from './env.js';

interface IBlameScanner {
    blockingPollLoop: () => void;
    dispose: () => void;
}

const FILE_BLAME_UPDATE_QUEUE = 'file-blame-update';
const REPO_SYNC_COMPLETE_QUEUE = 'repo-sync-complete';

type FileBlameUpdatePayload = {
    repoPath: string;
    globalFilepath: string;
    commitHash: string;
}

type RepoSyncCompletePayload = {
    repoPath: string;
    newHash: string;
}

type IndexWorkerPayload = FileBlameUpdatePayload;
type StatusUpdaterPayload = RepoSyncCompletePayload;

const logger = createLogger('blame-scanner');

export class BlameScanner implements IBlameScanner {
    private fileBlameQueue: Queue<FileBlameUpdatePayload>;
    private repoSyncCompleteQueue: Queue<RepoSyncCompletePayload>;
    private indexWorker: Worker;
    private statusUpdater: Worker;

    constructor(
        private db: PrismaClient,
        private settings: Settings,
        redis: Redis,
        private ctx: AppContext,
    ) {
        // Initialize queues
        this.fileBlameQueue = new Queue<FileBlameUpdatePayload>(FILE_BLAME_UPDATE_QUEUE, {
            connection: redis,
        });
        this.repoSyncCompleteQueue = new Queue<RepoSyncCompletePayload>(REPO_SYNC_COMPLETE_QUEUE, {
            connection: redis,
        });

        // Initialize workers
        this.indexWorker = new Worker(FILE_BLAME_UPDATE_QUEUE, this.runIndexJob.bind(this), {
            connection: redis,
            concurrency: 5, // Process 5 files concurrently
        });
        this.indexWorker.on('completed', this.onIndexJobCompleted.bind(this));
        this.indexWorker.on('failed', this.onIndexJobFailed.bind(this));

        this.statusUpdater = new Worker(REPO_SYNC_COMPLETE_QUEUE, this.runStatusUpdateJob.bind(this), {
            connection: redis,
            concurrency: 1,
        });
        this.statusUpdater.on('completed', this.onStatusUpdateJobCompleted.bind(this));
        this.statusUpdater.on('failed', this.onStatusUpdateJobFailed.bind(this));
    }

    public async blockingPollLoop() {
        while (true) {
            await this.scanRepositories();
            // Poll every 5 minutes
            await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
        }
    }

    ///////////////////////////
    // RepoScanner (Producer)
    ///////////////////////////

    private async scanRepositories() {
        const cacheDir = this.ctx.reposPath;
        
        if (!existsSync(cacheDir)) {
            logger.warn(`Cache directory does not exist: ${cacheDir}`);
            return;
        }

        logger.info(`Scanning repositories in ${cacheDir}`);

        try {
            const entries = readdirSync(cacheDir, { withFileTypes: true });
            
            for (const orgEntry of entries) {
                if (!orgEntry.isDirectory()) continue;
                
                const orgPath = join(cacheDir, orgEntry.name);
                const repos = readdirSync(orgPath, { withFileTypes: true });
                
                for (const repoEntry of repos) {
                    if (!repoEntry.isDirectory()) continue;
                    
                    const repoPath = join(orgPath, repoEntry.name);
                    await this.processRepo(repoPath);
                }
            }

            logger.info('Completed repository scan');
        } catch (error) {
            logger.error(`Failed to scan repositories: ${error}`);
            Sentry.captureException(error);
        }
    }

    private async processRepo(repoPath: string) {
        try {
            const git = simpleGit(repoPath);

            // Get the sync state
            const syncState = await this.db.repoSyncState.findUnique({
                where: { repoPath },
            });

            // Pull latest changes
            try {
                await git.fetch(['origin', '--prune']);
            } catch (error) {
                logger.error(`Failed to fetch repo ${repoPath}: ${error}`);
                return;
            }

            // Get new hash
            const newHash = await git.revparse(['HEAD']);

            const oldHash = syncState?.lastSyncedHash;

            // Skip if no changes
            if (oldHash === newHash) {
                return;
            }

            logger.info(`Processing repo ${repoPath} (old: ${oldHash || 'NULL'}, new: ${newHash})`);

            // Get changed files
            let changedFiles: string[];
            if (oldHash) {
                // Get files changed between old and new hash
                const diff = await git.diff(['--name-only', oldHash, newHash]);
                changedFiles = diff.split('\n').filter(f => f.trim() !== '');
            } else {
                // Get all files in the repo
                const lsTree = await git.raw(['ls-tree', '-r', '--name-only', newHash]);
                changedFiles = lsTree.split('\n').filter(f => f.trim() !== '');
            }

            logger.info(`Found ${changedFiles.length} changed files in ${repoPath}`);

            // Queue each changed file for blame processing
            const repoName = this.getRepoName(repoPath);
            const jobs = changedFiles.map(filepath => ({
                name: 'file-blame-update',
                data: {
                    repoPath,
                    globalFilepath: `${repoName}/${filepath}`,
                    commitHash: newHash,
                },
                opts: {
                    removeOnComplete: env.REDIS_REMOVE_ON_COMPLETE,
                    removeOnFail: env.REDIS_REMOVE_ON_FAIL,
                },
            }));

            if (jobs.length > 0) {
                await this.fileBlameQueue.addBulk(jobs);
                logger.info(`Queued ${jobs.length} file blame jobs for ${repoPath}`);
            }

            // Queue the completion signal
            await this.repoSyncCompleteQueue.add('repo-sync-complete', {
                repoPath,
                newHash,
            }, {
                removeOnComplete: env.REDIS_REMOVE_ON_COMPLETE,
                removeOnFail: env.REDIS_REMOVE_ON_FAIL,
            });

        } catch (error) {
            logger.error(`Failed to process repo ${repoPath}: ${error}`);
            Sentry.captureException(error);
        }
    }

    private getRepoName(repoPath: string): string {
        // Extract repo name from path like /data/.sourcebot/cache/org/repo
        const parts = repoPath.split('/');
        if (parts.length < 2) {
            return repoPath;
        }
        // Return org/repo
        return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    }

    ///////////////////////////
    // IndexWorker (Consumer)
    ///////////////////////////

    private async runIndexJob(job: Job<IndexWorkerPayload>) {
        const { repoPath, globalFilepath, commitHash } = job.data;
        
        logger.info(`Processing blame for ${globalFilepath}`);

        try {
            // Extract the file path relative to repo
            const repoName = this.getRepoName(repoPath);
            const filepath = globalFilepath.replace(`${repoName}/`, '');

            // Get new authors from git blame
            const newAuthors = await this.getAuthorsFromGitBlame(repoPath, filepath);

            // Get old authors from database
            const oldAuthorsRecords = await this.db.filepathToAuthor.findMany({
                where: { globalFilepath },
                select: { authorEmail: true },
            });
            const oldAuthors = new Set(oldAuthorsRecords.map(r => r.authorEmail));

            // Calculate diff
            const authorsToAdd = Array.from(newAuthors).filter(a => !oldAuthors.has(a));
            const authorsToRemove = Array.from(oldAuthors).filter(a => !newAuthors.has(a));

            // Atomic update
            await this.db.$transaction(async (tx) => {
                // Add new authors
                for (const email of authorsToAdd) {
                    await tx.filepathToAuthor.upsert({
                        where: {
                            globalFilepath_authorEmail: {
                                globalFilepath,
                                authorEmail: email,
                            },
                        },
                        create: {
                            globalFilepath,
                            authorEmail: email,
                        },
                        update: {},
                    });

                    await tx.authorToFilepath.upsert({
                        where: {
                            authorEmail_globalFilepath: {
                                authorEmail: email,
                                globalFilepath,
                            },
                        },
                        create: {
                            authorEmail: email,
                            globalFilepath,
                        },
                        update: {},
                    });
                }

                // Remove old authors
                for (const email of authorsToRemove) {
                    await tx.filepathToAuthor.delete({
                        where: {
                            globalFilepath_authorEmail: {
                                globalFilepath,
                                authorEmail: email,
                            },
                        },
                    });

                    await tx.authorToFilepath.delete({
                        where: {
                            authorEmail_globalFilepath: {
                                authorEmail: email,
                                globalFilepath,
                            },
                        },
                    });
                }
            });

            logger.info(`Updated blame for ${globalFilepath}: +${authorsToAdd.length} -${authorsToRemove.length} authors`);

        } catch (error) {
            logger.error(`Failed to process blame for ${globalFilepath}: ${error}`);
            throw error;
        }
    }

    private async getAuthorsFromGitBlame(repoPath: string, filepath: string): Promise<Set<string>> {
        const git = simpleGit(repoPath);
        const authors = new Set<string>();

        try {
            // Run git blame --porcelain
            const blameOutput = await git.raw(['blame', '--porcelain', '--', filepath]);

            // Parse the porcelain output for author-mail lines
            const lines = blameOutput.split('\n');
            for (const line of lines) {
                if (line.startsWith('author-mail ')) {
                    // Extract email from "author-mail <email@example.com>"
                    const match = line.match(/author-mail <(.+)>/);
                    if (match && match[1]) {
                        authors.add(match[1]);
                    }
                }
            }
        } catch (error) {
            // File might have been deleted or doesn't exist at this commit
            logger.warn(`Could not get blame for ${filepath} in ${repoPath}: ${error}`);
        }

        return authors;
    }

    private async onIndexJobCompleted(job: Job) {
        logger.info(`Completed index job ${job.id} for ${job.data.globalFilepath}`);
    }

    private async onIndexJobFailed(job: Job | undefined, error: Error) {
        if (!job) {
            logger.error(`Index job failed with no job data: ${error}`);
            return;
        }
        logger.error(`Index job ${job.id} failed for ${job.data.globalFilepath}: ${error}`);
        Sentry.captureException(error);
    }

    ///////////////////////////
    // StatusUpdater (Consumer)
    ///////////////////////////

    private async runStatusUpdateJob(job: Job<StatusUpdaterPayload>) {
        const { repoPath, newHash } = job.data;

        try {
            await this.db.repoSyncState.upsert({
                where: { repoPath },
                create: {
                    repoPath,
                    lastSyncedHash: newHash,
                },
                update: {
                    lastSyncedHash: newHash,
                },
            });

            logger.info(`Updated sync state for ${repoPath}: ${newHash}`);
        } catch (error) {
            logger.error(`Failed to update sync state for ${repoPath}: ${error}`);
            throw error;
        }
    }

    private async onStatusUpdateJobCompleted(job: Job) {
        logger.info(`Completed status update job ${job.id} for ${job.data.repoPath}`);
    }

    private async onStatusUpdateJobFailed(job: Job | undefined, error: Error) {
        if (!job) {
            logger.error(`Status update job failed with no job data: ${error}`);
            return;
        }
        logger.error(`Status update job ${job.id} failed for ${job.data.repoPath}: ${error}`);
        Sentry.captureException(error);
    }

    ///////////////////////////
    // Cleanup
    ///////////////////////////

    public async dispose() {
        await this.indexWorker.close();
        await this.statusUpdater.close();
        await this.fileBlameQueue.close();
        await this.repoSyncCompleteQueue.close();
    }
}
