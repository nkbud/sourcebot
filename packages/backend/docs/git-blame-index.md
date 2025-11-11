# Git Blame Bi-Directional Index

This feature provides a continuously updated index that tracks which authors have contributed to which files across all repositories.

## Overview

The Git Blame Index maintains two bi-directional lookup tables:

1. **Author → Filepaths**: Find all files an author has contributed to
2. **Filepath → Authors**: Find all authors who have contributed to a file

## Database Tables

### `author_to_filepaths`
Stores the mapping from authors to files they've touched.

```sql
SELECT global_filepath 
FROM author_to_filepaths 
WHERE author_email = 'user@example.com';
```

### `filepath_to_authors`
Stores the mapping from files to their contributors.

```sql
SELECT author_email 
FROM filepath_to_authors 
WHERE global_filepath = 'nkbud/sourcebot/src/main.ts';
```

### `_repo_sync_state`
Internal table tracking the last synced commit hash for each repository.

## How It Works

### 1. Repository Scanning
Every 5 minutes, the BlameScanner:
- Queries all repos from the database
- Fetches the latest changes from origin
- Compares current HEAD with last synced hash
- Identifies changed files

### 2. Blame Processing
For each changed file:
- Runs `git blame --porcelain` to extract author emails
- Compares new authors with existing database records
- Calculates authors to add and authors to remove
- Atomically updates both index tables

### 3. State Updates
After all files in a repo are processed:
- Updates the `last_synced_hash` in `_repo_sync_state`
- Ensures idempotency for subsequent scans

## Architecture

### Components

- **RepoScanner (Producer)**: Scans repos and enqueues file blame jobs
- **IndexWorker (Consumer)**: Processes git blame and updates indexes (5 concurrent workers)
- **StatusUpdater (Consumer)**: Updates sync state (1 worker)

### Queue System

Uses BullMQ with two queues:
- `file-blame-update`: Individual file blame processing
- `repo-sync-complete`: Repo sync state updates

## Performance Characteristics

- **Incremental Updates**: Only processes files that have changed
- **Concurrent Processing**: 5 files processed in parallel
- **Atomic Transactions**: Ensures index consistency
- **Graceful Degradation**: Handles deleted files and fetch failures

## Example Queries

### Find all files touched by an author
```typescript
const files = await db.authorToFilepath.findMany({
  where: { authorEmail: 'user@example.com' },
  select: { globalFilepath: true },
});
```

### Find all authors who contributed to a file
```typescript
const authors = await db.filepathToAuthor.findMany({
  where: { globalFilepath: 'nkbud/sourcebot/README.md' },
  select: { authorEmail: true },
});
```

### Get contribution statistics
```typescript
// Count files per author
const authorStats = await db.authorToFilepath.groupBy({
  by: ['authorEmail'],
  _count: { globalFilepath: true },
  orderBy: { _count: { globalFilepath: 'desc' } },
});

// Count authors per file
const fileStats = await db.filepathToAuthor.groupBy({
  by: ['globalFilepath'],
  _count: { authorEmail: true },
  orderBy: { _count: { authorEmail: 'desc' } },
});
```

## Configuration

The BlameScanner is automatically initialized in `main.ts` and runs alongside other backend services. No additional configuration is required.

## Testing

Run the test suite:
```bash
cd packages/backend
yarn test blameScanner.test.ts
```

## Monitoring

The BlameScanner logs to the 'blame-scanner' logger. Monitor for:
- Repository scan cycles
- File blame processing completion
- Errors during git operations
- Queue processing metrics

## Limitations

- Only tracks files that exist in the current HEAD
- Requires repositories to be cloned locally
- Email addresses must be in standard git format
- Does not track line-level contributions (only file-level)

## Future Enhancements

Potential improvements:
- Add line count tracking per author/file
- Support for tracking contributions by commit count
- API endpoints for querying the index
- Dashboard visualizations
- Historical trend tracking
