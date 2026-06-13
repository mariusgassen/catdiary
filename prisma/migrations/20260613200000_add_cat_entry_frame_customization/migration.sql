-- Frame customization: an entry can override its frame's chrome color, tilt and
-- label text. All three are nullable so existing entries keep the frame's
-- defaults (palette, id-hashed tilt, auto-generated label).

-- AlterTable
ALTER TABLE "cat_entries" ADD COLUMN     "frame_color" TEXT;
ALTER TABLE "cat_entries" ADD COLUMN     "frame_tilt" INTEGER;
ALTER TABLE "cat_entries" ADD COLUMN     "frame_caption" TEXT;
