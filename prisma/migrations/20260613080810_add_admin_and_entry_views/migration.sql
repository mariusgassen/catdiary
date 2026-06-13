-- NOTE: the auto-generated diff wanted to DROP "CatEntry_embedding_hnsw_idx"
-- here. That index lives outside the Prisma schema (the embedding column is
-- Unsupported), so the drop was removed before applying — keep the index.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EntryView" (
    "userId" TEXT NOT NULL,
    "catEntryId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryView_pkey" PRIMARY KEY ("userId","catEntryId")
);

-- CreateIndex
CREATE INDEX "EntryView_catEntryId_idx" ON "EntryView"("catEntryId");

-- CreateIndex
CREATE INDEX "EntryView_userId_lastSeenAt_idx" ON "EntryView"("userId", "lastSeenAt");

-- AddForeignKey
ALTER TABLE "EntryView" ADD CONSTRAINT "EntryView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryView" ADD CONSTRAINT "EntryView_catEntryId_fkey" FOREIGN KEY ("catEntryId") REFERENCES "CatEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
