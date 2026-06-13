-- NOTE: the auto-generated diff wanted to DROP "cat_entries_embedding_hnsw_idx"
-- here. That index lives outside the Prisma schema (the embedding column is
-- Unsupported), so the drop was removed before applying — keep the index.

-- CreateTable
CREATE TABLE "cats" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breed" TEXT,
    "color" TEXT,
    "description" TEXT,
    "is_owned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cats_owner_id_created_at_idx" ON "cats"("owner_id", "created_at");

-- AlterTable
ALTER TABLE "cat_entries" ADD COLUMN     "cat_id" TEXT;

-- CreateIndex
CREATE INDEX "cat_entries_cat_id_idx" ON "cat_entries"("cat_id");

-- AddForeignKey
ALTER TABLE "cats" ADD CONSTRAINT "cats_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_entries" ADD CONSTRAINT "cat_entries_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
