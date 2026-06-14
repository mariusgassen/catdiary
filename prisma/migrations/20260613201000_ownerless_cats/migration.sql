-- NOTE: the auto-generated diff wanted to DROP "cat_entries_embedding_hnsw_idx"
-- here. That index lives outside the Prisma schema (the embedding column is
-- Unsupported), so the drop was removed before applying — keep the index.

-- A cat is now an ownerless cluster of linked sightings; `owner_id` is set only
-- when someone claims it as their pet, and a cat no longer needs a name of its
-- own (names are derived from its sightings).

-- AlterTable
ALTER TABLE "cats" ALTER COLUMN "owner_id" DROP NOT NULL;
ALTER TABLE "cats" ALTER COLUMN "name" DROP NOT NULL;

-- Re-point the owner FK to SET NULL so deleting a user leaves the cats they had
-- claimed as ownerless clusters (the shared sighting history is preserved).
ALTER TABLE "cats" DROP CONSTRAINT "cats_owner_id_fkey";
ALTER TABLE "cats" ADD CONSTRAINT "cats_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
