-- CreateTable
CREATE TABLE "AuthorToFilepath" (
    "id" SERIAL NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "globalFilepath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorToFilepath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilepathToAuthor" (
    "id" SERIAL NOT NULL,
    "globalFilepath" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilepathToAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepoBlameState" (
    "id" SERIAL NOT NULL,
    "repoPath" TEXT NOT NULL,
    "lastSyncedHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepoBlameState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthorToFilepath_authorEmail_idx" ON "AuthorToFilepath"("authorEmail");

-- CreateIndex
CREATE INDEX "AuthorToFilepath_globalFilepath_idx" ON "AuthorToFilepath"("globalFilepath");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorToFilepath_authorEmail_globalFilepath_key" ON "AuthorToFilepath"("authorEmail", "globalFilepath");

-- CreateIndex
CREATE INDEX "FilepathToAuthor_globalFilepath_idx" ON "FilepathToAuthor"("globalFilepath");

-- CreateIndex
CREATE INDEX "FilepathToAuthor_authorEmail_idx" ON "FilepathToAuthor"("authorEmail");

-- CreateIndex
CREATE UNIQUE INDEX "FilepathToAuthor_globalFilepath_authorEmail_key" ON "FilepathToAuthor"("globalFilepath", "authorEmail");

-- CreateIndex
CREATE INDEX "RepoBlameState_repoPath_idx" ON "RepoBlameState"("repoPath");

-- CreateIndex
CREATE UNIQUE INDEX "RepoBlameState_repoPath_key" ON "RepoBlameState"("repoPath");
