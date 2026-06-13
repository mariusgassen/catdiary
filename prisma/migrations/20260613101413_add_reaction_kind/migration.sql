-- NOTE: the auto-generated diff wanted to DROP "cat_entries_embedding_hnsw_idx"
-- here. That index lives outside the Prisma schema (the embedding column is
-- Unsupported), so the drop was removed before applying — keep the index.

-- CreateEnum
CREATE TYPE "reaction_kind" AS ENUM ('PAW', 'SPOTTED', 'HANDSOME', 'SAME_CAT', 'SAFE');

-- AlterTable
ALTER TABLE "likes" ADD COLUMN     "kind" "reaction_kind" NOT NULL DEFAULT 'PAW';
