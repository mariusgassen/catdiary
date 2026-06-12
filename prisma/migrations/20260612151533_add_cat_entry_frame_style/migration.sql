-- NOTE: the auto-generated diff wanted to DROP "CatEntry_embedding_hnsw_idx"
-- here. That index lives outside the Prisma schema (the embedding column is
-- Unsupported), so the drop was removed before applying — keep the index.

-- CreateEnum
CREATE TYPE "FrameStyle" AS ENUM ('POLAROID', 'SPECIMEN', 'INDEX_CARD', 'POSTCARD', 'TICKET');

-- AlterTable
ALTER TABLE "CatEntry" ADD COLUMN     "frameStyle" "FrameStyle" NOT NULL DEFAULT 'POLAROID';
