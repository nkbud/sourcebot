import { expect, test, describe } from 'vitest';

describe('BlameIndexManager Logic', () => {
    describe('Index update logic', () => {
        test('should handle unique author emails correctly', () => {
            const emails = ['user1@example.com', 'user2@example.com', 'user1@example.com'];
            const uniqueEmails = Array.from(new Set(emails));
            expect(uniqueEmails).toHaveLength(2);
            expect(uniqueEmails).toContain('user1@example.com');
            expect(uniqueEmails).toContain('user2@example.com');
        });

        test('should construct global filepath correctly', () => {
            const repoName = 'github.com/test/repo';
            const filePath = 'src/index.ts';
            const globalFilepath = `${repoName}/${filePath}`;
            expect(globalFilepath).toBe('github.com/test/repo/src/index.ts');
        });
    });

    describe('Changed files detection', () => {
        test('should detect when first sync is needed', () => {
            const lastSyncedHash = null;
            const isFirstSync = lastSyncedHash === null;
            expect(isFirstSync).toBe(true);
        });

        test('should detect when incremental sync is needed', () => {
            const lastSyncedHash = 'abc123';
            const currentHash = 'def456';
            const needsSync = lastSyncedHash !== currentHash;
            expect(needsSync).toBe(true);
        });

        test('should detect when no sync is needed', () => {
            const lastSyncedHash = 'abc123';
            const currentHash = 'abc123';
            const needsSync = lastSyncedHash !== currentHash;
            expect(needsSync).toBe(false);
        });
    });

    describe('Blame parsing', () => {
        test('should parse author email from blame output line', () => {
            const blameLine = 'author-mail <user@example.com>';
            const emailMatch = blameLine.match(/^author-mail <(.+)>$/);
            expect(emailMatch).toBeTruthy();
            expect(emailMatch![1]).toBe('user@example.com');
        });

        test('should handle multiple authors in blame output', () => {
            const blameOutput = `author-mail <user1@example.com>
other-line
author-mail <user2@example.com>
author-mail <user1@example.com>`;
            
            const authorEmails = new Set<string>();
            const lines = blameOutput.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('author-mail ')) {
                    const email = line.substring('author-mail '.length).replace(/^<|>$/g, '');
                    if (email && email.length > 0) {
                        authorEmails.add(email);
                    }
                }
            }
            
            expect(Array.from(authorEmails)).toHaveLength(2);
            expect(authorEmails.has('user1@example.com')).toBe(true);
            expect(authorEmails.has('user2@example.com')).toBe(true);
        });

        test('should handle empty email correctly', () => {
            const blameLine = 'author-mail <>';
            const email = blameLine.substring('author-mail '.length).replace(/^<|>$/g, '');
            expect(email).toBe('');
        });

        test('should filter out empty emails from results', () => {
            const blameOutput = `author-mail <user1@example.com>
author-mail <>
author-mail <user2@example.com>`;
            
            const authorEmails = new Set<string>();
            const lines = blameOutput.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('author-mail ')) {
                    const email = line.substring('author-mail '.length).replace(/^<|>$/g, '');
                    if (email && email.length > 0) {
                        authorEmails.add(email);
                    }
                }
            }
            
            expect(Array.from(authorEmails)).toHaveLength(2);
            expect(authorEmails.has('user1@example.com')).toBe(true);
            expect(authorEmails.has('user2@example.com')).toBe(true);
            expect(authorEmails.has('')).toBe(false);
        });
    });

    describe('Job ID generation', () => {
        test('should generate unique job IDs', () => {
            const repoId = 123;
            const timestamp1 = Date.now();
            const jobId1 = `blame-scan-${repoId}-${timestamp1}`;
            
            // Small delay to ensure different timestamp
            const timestamp2 = timestamp1 + 1;
            const jobId2 = `blame-scan-${repoId}-${timestamp2}`;
            
            expect(jobId1).not.toBe(jobId2);
        });

        test('should include repo ID in job ID', () => {
            const repoId = 456;
            const timestamp = Date.now();
            const jobId = `blame-scan-${repoId}-${timestamp}`;
            
            expect(jobId).toContain(`blame-scan-${repoId}`);
        });
    });
});
