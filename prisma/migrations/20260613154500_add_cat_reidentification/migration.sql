-- NOTE: the auto-generated diff wanted to DROP "cat_entries_embedding_hnsw_idx"
-- here. That index lives outside the Prisma schema (the embedding column is
-- Unsupported), so the drop was removed before applying — keep the index.

-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'CAT_LINK_REQUEST';
ALTER TYPE "notification_type" ADD VALUE 'CAT_LINK_APPROVED';

-- CreateEnum
CREATE TYPE "cat_link_status" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "cat_id" TEXT;

-- CreateTable
CREATE TABLE "cat_links" (
    "id" TEXT NOT NULL,
    "cat_id" TEXT NOT NULL,
    "cat_entry_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "status" "cat_link_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cat_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cat_links_cat_id_status_idx" ON "cat_links"("cat_id", "status");

-- CreateIndex
CREATE INDEX "cat_links_requester_id_idx" ON "cat_links"("requester_id");

-- CreateIndex
CREATE UNIQUE INDEX "cat_links_cat_id_cat_entry_id_key" ON "cat_links"("cat_id", "cat_entry_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_links" ADD CONSTRAINT "cat_links_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_links" ADD CONSTRAINT "cat_links_cat_entry_id_fkey" FOREIGN KEY ("cat_entry_id") REFERENCES "cat_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_links" ADD CONSTRAINT "cat_links_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
