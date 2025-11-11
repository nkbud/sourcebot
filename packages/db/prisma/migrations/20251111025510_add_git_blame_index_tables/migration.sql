-- CreateTable
CREATE TABLE "author_to_filepaths" (
    "author_email" TEXT NOT NULL,
    "global_filepath" TEXT NOT NULL,

    CONSTRAINT "author_to_filepaths_pkey" PRIMARY KEY ("author_email","global_filepath")
);

-- CreateTable
CREATE TABLE "filepath_to_authors" (
    "global_filepath" TEXT NOT NULL,
    "author_email" TEXT NOT NULL,

    CONSTRAINT "filepath_to_authors_pkey" PRIMARY KEY ("global_filepath","author_email")
);

-- CreateTable
CREATE TABLE "_repo_sync_state" (
    "repo_path" TEXT NOT NULL,
    "last_synced_hash" TEXT,

    CONSTRAINT "_repo_sync_state_pkey" PRIMARY KEY ("repo_path")
);
