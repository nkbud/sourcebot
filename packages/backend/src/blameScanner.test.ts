import { expect, test, describe } from 'vitest';

describe('BlameScanner Helper Functions', () => {
    test('should extract email from git blame porcelain output', () => {
        const blameOutput = `
abc123 1 1 1
author John Doe
author-mail <john.doe@example.com>
author-time 1234567890
author-tz -0700
committer Jane Smith
committer-mail <jane.smith@example.com>
committer-time 1234567891
committer-tz -0700
summary Initial commit
filename test.txt
	First line of code
def456 2 2 1
author Alice Johnson
author-mail <alice.johnson@example.com>
author-time 1234567892
author-tz -0700
committer Alice Johnson
committer-mail <alice.johnson@example.com>
committer-time 1234567892
committer-tz -0700
summary Update test.txt
previous ghi789 test.txt
filename test.txt
	Second line of code
        `.trim();

        const authors = extractAuthorsFromBlameOutput(blameOutput);
        
        expect(authors.size).toBe(2);
        expect(authors.has('john.doe@example.com')).toBe(true);
        expect(authors.has('alice.johnson@example.com')).toBe(true);
    });

    test('should handle empty blame output', () => {
        const blameOutput = '';
        const authors = extractAuthorsFromBlameOutput(blameOutput);
        
        expect(authors.size).toBe(0);
    });

    test('should handle duplicate authors', () => {
        const blameOutput = `
author-mail <same@example.com>
author-mail <same@example.com>
author-mail <different@example.com>
        `.trim();

        const authors = extractAuthorsFromBlameOutput(blameOutput);
        
        expect(authors.size).toBe(2);
        expect(authors.has('same@example.com')).toBe(true);
        expect(authors.has('different@example.com')).toBe(true);
    });
});

describe('Blame Diff Calculation', () => {
    test('should calculate authors to add', () => {
        const oldAuthors = new Set(['user1@example.com', 'user2@example.com']);
        const newAuthors = new Set(['user2@example.com', 'user3@example.com']);
        
        const authorsToAdd = Array.from(newAuthors).filter(a => !oldAuthors.has(a));
        const authorsToRemove = Array.from(oldAuthors).filter(a => !newAuthors.has(a));
        
        expect(authorsToAdd).toEqual(['user3@example.com']);
        expect(authorsToRemove).toEqual(['user1@example.com']);
    });

    test('should handle no changes', () => {
        const oldAuthors = new Set(['user1@example.com', 'user2@example.com']);
        const newAuthors = new Set(['user1@example.com', 'user2@example.com']);
        
        const authorsToAdd = Array.from(newAuthors).filter(a => !oldAuthors.has(a));
        const authorsToRemove = Array.from(oldAuthors).filter(a => !newAuthors.has(a));
        
        expect(authorsToAdd).toEqual([]);
        expect(authorsToRemove).toEqual([]);
    });

    test('should handle all new authors', () => {
        const oldAuthors = new Set<string>([]);
        const newAuthors = new Set(['user1@example.com', 'user2@example.com']);
        
        const authorsToAdd = Array.from(newAuthors).filter(a => !oldAuthors.has(a));
        const authorsToRemove = Array.from(oldAuthors).filter(a => !newAuthors.has(a));
        
        expect(authorsToAdd.sort()).toEqual(['user1@example.com', 'user2@example.com'].sort());
        expect(authorsToRemove).toEqual([]);
    });

    test('should handle all authors removed', () => {
        const oldAuthors = new Set(['user1@example.com', 'user2@example.com']);
        const newAuthors = new Set<string>([]);
        
        const authorsToAdd = Array.from(newAuthors).filter(a => !oldAuthors.has(a));
        const authorsToRemove = Array.from(oldAuthors).filter(a => !newAuthors.has(a));
        
        expect(authorsToAdd).toEqual([]);
        expect(authorsToRemove.sort()).toEqual(['user1@example.com', 'user2@example.com'].sort());
    });
});

describe('Global Filepath Parsing', () => {
    test('should extract file path from global filepath', () => {
        const globalFilepath = 'nkbud/sourcebot/src/main.ts';
        const firstSlashIndex = globalFilepath.indexOf('/');
        const filepath = firstSlashIndex >= 0 ? globalFilepath.substring(firstSlashIndex + 1) : globalFilepath;
        
        expect(filepath).toBe('sourcebot/src/main.ts');
    });

    test('should handle filepath with multiple slashes', () => {
        const globalFilepath = 'org/repo/path/to/file.ts';
        const firstSlashIndex = globalFilepath.indexOf('/');
        const filepath = firstSlashIndex >= 0 ? globalFilepath.substring(firstSlashIndex + 1) : globalFilepath;
        
        expect(filepath).toBe('repo/path/to/file.ts');
    });

    test('should handle filepath with no slashes', () => {
        const globalFilepath = 'file.ts';
        const firstSlashIndex = globalFilepath.indexOf('/');
        const filepath = firstSlashIndex >= 0 ? globalFilepath.substring(firstSlashIndex + 1) : globalFilepath;
        
        expect(filepath).toBe('file.ts');
    });
});

// Helper function extracted from BlameScanner for testing
function extractAuthorsFromBlameOutput(blameOutput: string): Set<string> {
    const authors = new Set<string>();
    const lines = blameOutput.split('\n');
    
    for (const line of lines) {
        if (line.startsWith('author-mail ')) {
            const match = line.match(/author-mail <(.+)>/);
            if (match && match[1]) {
                authors.add(match[1]);
            }
        }
    }
    
    return authors;
}
