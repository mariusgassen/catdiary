CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "CatEntry" ADD COLUMN "embedding" vector(512);

-- HNSW index for fast approximate cosine-distance search
CREATE INDEX "CatEntry_embedding_hnsw_idx"
  ON "CatEntry" USING hnsw ("embedding" vector_cosine_ops);
