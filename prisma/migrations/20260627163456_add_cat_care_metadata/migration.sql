-- NOTE: the auto-generated diff wanted to DROP "cat_entries_embedding_hnsw_idx"
-- here. That index lives outside the Prisma schema (the embedding column is
-- Unsupported), so the drop was removed before applying — keep the index.

-- AlterTable
ALTER TABLE "cats" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "birthday" DATE,
ADD COLUMN     "care_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "microchip_id" TEXT,
ADD COLUMN     "neutered" BOOLEAN,
ADD COLUMN     "vet_notes" TEXT;

-- CreateTable
CREATE TABLE "cat_vaccinations" (
    "id" TEXT NOT NULL,
    "cat_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "given_at" DATE NOT NULL,
    "due_at" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cat_vaccinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_weight_entries" (
    "id" TEXT NOT NULL,
    "cat_id" TEXT NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "measured_at" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cat_weight_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cat_vaccinations_cat_id_given_at_idx" ON "cat_vaccinations"("cat_id", "given_at");

-- CreateIndex
CREATE INDEX "cat_weight_entries_cat_id_measured_at_idx" ON "cat_weight_entries"("cat_id", "measured_at");

-- AddForeignKey
ALTER TABLE "cat_vaccinations" ADD CONSTRAINT "cat_vaccinations_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_weight_entries" ADD CONSTRAINT "cat_weight_entries_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
