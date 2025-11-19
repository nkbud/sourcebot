# Git Blame Bidirectional Index

## Overview

The Git Blame Bidirectional Index provides fast queries for:
- **Author → Files**: "What files has this author touched?"
- **File → Authors**: "Which authors have touched this file?"

## Database Schema

### Tables

#### `AuthorToFilepath`
Maps author emails to the files they've contributed to.

```sql
- id: SERIAL PRIMARY KEY
- authorEmail: TEXT NOT NULL
- globalFilepath: TEXT NOT NULL (format: {repo_name}/{file_path})
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
- UNIQUE (authorEmail, globalFilepath)
- INDEX (authorEmail)
- INDEX (globalFilepath)
```

#### `FilepathToAuthor`
Maps files to the authors who have contributed to them.

```sql
- id: SERIAL PRIMARY KEY
- globalFilepath: TEXT NOT NULL (format: {repo_name}/{file_path})
- authorEmail: TEXT NOT NULL
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
- UNIQUE (globalFilepath, authorEmail)
- INDEX (globalFilepath)
- INDEX (authorEmail)
```

#### `RepoBlameState`
Tracks the last synced commit for each repository.

```sql
- id: SERIAL PRIMARY KEY
- repoPath: TEXT NOT NULL (format: {repo_name})
- lastSyncedHash: TEXT (commit hash)
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
- UNIQUE (repoPath)
- INDEX (repoPath)
```

## Architecture

### Pipeline Stages

1. **BlameScanner** (Queue: `repo-blame-scan`)
   - Triggered automatically after repository indexing
   - Detects changed files since last sync
   - Queues file-level blame updates

2. **IndexWorker** (Queue: `file-blame-update`)
   - Processes blame data for individual files
   - Runs `git blame --line-porcelain` to extract authors
   - Atomically updates both indexes

3. **StatusUpdater** (Queue: `repo-blame-commit`)
   - Records the completed sync state
   - Updates `lastSyncedHash` for incremental future scans

### How It Works

```
Repository Indexed
       ↓
BlameScanner triggered
       ↓
Determine changed files (git diff / git ls-tree)
       ↓
Queue file-blame-update for each file
       ↓
IndexWorker processes files concurrently
       ↓
For each file: git blame → extract authors → update indexes
       ↓
StatusUpdater commits sync state
```

## Query Examples

### Find all files touched by an author

```typescript
const files = await prisma.authorToFilepath.findMany({
  where: {
    authorEmail: 'developer@example.com'
  },
  select: {
    globalFilepath: true
  }
});
```

### Find all authors who touched a file

```typescript
const authors = await prisma.filepathToAuthor.findMany({
  where: {
    globalFilepath: 'github.com/user/repo/src/index.ts'
  },
  select: {
    authorEmail: true
  }
});
```

### Check sync status for a repository

```typescript
const syncState = await prisma.repoBlameState.findUnique({
  where: {
    repoPath: 'github.com/user/repo'
  }
});
```

## Features

### Incremental Updates
- First sync: Processes all files in the repository
- Subsequent syncs: Only processes changed files
- Efficient `git diff` to identify changes

### Idempotency
- Safe to run multiple times on the same data
- Atomic database transactions prevent partial updates
- Deletes old entries before inserting new ones

### Fault Tolerance
- 3 retry attempts per job
- Graceful error handling with Sentry integration
- Continues processing even if individual files fail

### Performance
- Concurrent file processing (concurrency: 5)
- Indexed database columns for fast queries
- Grouped jobs by repository to avoid conflicts

## Configuration

### Timeouts

- **Repository scan**: Uses `settings.repoIndexTimeoutMs`
- **File update**: 60 seconds per file
- **Commit**: 30 seconds

### Concurrency

- **Scan workers**: 2
- **File update workers**: 5
- **Commit workers**: 2

### Retries

- **Max attempts**: 3 per job
- **Stalled count**: 1 before failing

## Monitoring

### Logging

All operations are logged with structured metadata:
- Log tag: `blame-index-manager`
- Job-specific logs: `blame-index-manager:job:{jobId}`

### Error Tracking

Errors are automatically sent to Sentry with contextual tags:
- `jobId`: Unique job identifier
- `jobType`: SCAN, FILE_UPDATE, or COMMIT
- `component`: blame-index-worker

### Queue Visibility

Queue status can be monitored via Redis:
- `repo-blame-scan`: Scan jobs
- `file-blame-update`: File update jobs
- `repo-blame-commit`: Commit jobs

## Maintenance

### Manual Reindex

To manually trigger a blame scan for a repository:

```typescript
await blameIndexManager.queueBlameScan(repo);
```

### Clear Index for Repository

```typescript
// Remove all blame data for a repository
await prisma.$transaction(async (tx) => {
  const repoName = 'github.com/user/repo';
  
  await tx.authorToFilepath.deleteMany({
    where: {
      globalFilepath: {
        startsWith: `${repoName}/`
      }
    }
  });
  
  await tx.filepathToAuthor.deleteMany({
    where: {
      globalFilepath: {
        startsWith: `${repoName}/`
      }
    }
  });
  
  await tx.repoBlameState.delete({
    where: { repoPath: repoName }
  });
});
```

### Reset Sync State

To force a full rescan:

```typescript
await prisma.repoBlameState.update({
  where: { repoPath: 'github.com/user/repo' },
  data: { lastSyncedHash: null }
});
```

## Future Enhancements

### Optional Features (Not Implemented)

- **Metrics**: Track latency, files processed, success rates
- **CLI Tool**: Command-line interface to rebuild blame index
- **Poison Queue**: Separate queue for repeatedly failing jobs
- **Batch Operations**: Bulk insert for better performance
- **TTL**: Automatic cleanup of stale index entries
