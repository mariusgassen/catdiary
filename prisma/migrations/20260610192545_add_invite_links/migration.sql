-- NOTE: the auto-generated diff wanted to DROP "CatEntry_embedding_hnsw_idx"
-- here. That index lives outside the Prisma schema (the embedding column is
-- Unsupported), so the drop was removed before applying — keep the index.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "invitedById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
