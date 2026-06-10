-- NOTE: the auto-generated diff wanted to DROP "CatEntry_embedding_hnsw_idx"
-- here. That index lives outside the Prisma schema (the embedding column is
-- Unsupported), so the drop was removed before applying — keep the index.

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
