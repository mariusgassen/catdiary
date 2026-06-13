-- Frame customization, round two: a paper tint (separate from the chrome color)
-- and a custom header label (the index card's "Call no."). Both nullable so
-- existing entries keep the frame's defaults.

-- AlterTable
ALTER TABLE "cat_entries" ADD COLUMN     "frame_paper" TEXT;
ALTER TABLE "cat_entries" ADD COLUMN     "frame_label" TEXT;
