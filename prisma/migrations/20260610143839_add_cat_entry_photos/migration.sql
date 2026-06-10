-- Entries now hold 1..10 photos in a dedicated table (position 0 = cover).
-- Existing single-photo data is moved into it before the old columns go away.

-- CreateTable
CREATE TABLE "CatEntryPhoto" (
    "id" TEXT NOT NULL,
    "catEntryId" TEXT NOT NULL,
    "photoKey" TEXT NOT NULL,
    "thumbKey" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CatEntryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatEntryPhoto_catEntryId_position_idx" ON "CatEntryPhoto"("catEntryId", "position");

-- AddForeignKey
ALTER TABLE "CatEntryPhoto" ADD CONSTRAINT "CatEntryPhoto_catEntryId_fkey" FOREIGN KEY ("catEntryId") REFERENCES "CatEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: each existing entry's single photo becomes its cover photo.
INSERT INTO "CatEntryPhoto" ("id", "catEntryId", "photoKey", "thumbKey", "position")
SELECT gen_random_uuid()::text, "id", "photoKey", "thumbKey", 0
FROM "CatEntry";

-- AlterTable
ALTER TABLE "CatEntry" DROP COLUMN "photoKey",
DROP COLUMN "thumbKey";
