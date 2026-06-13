-- NOTE: the auto-generated diff wanted to DROP "CatEntry_embedding_hnsw_idx"
-- here. That index lives outside the Prisma schema (the embedding column is
-- Unsupported), so the drop was removed before applying — keep the index.

-- AlterTable
ALTER TABLE "EntryView" ADD COLUMN     "dwellMs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "feedImpressions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxReadPct" INTEGER NOT NULL DEFAULT 0;
