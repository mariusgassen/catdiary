import { db } from "@/lib/db";
import { canViewCatEntry, CatEntryForbiddenError, CatEntryNotFoundError } from "@/lib/catEntries";

/**
 * Records that `viewerId` has seen an entry. One row per (viewer, entry):
 * the first view creates it, repeat views bump `count` and `lastSeenAt`.
 *
 * The viewer must be allowed to see the entry (self, public owner, or approved
 * follower). The owner's own views are intentionally NOT recorded — "seen"
 * status measures the audience, not the author re-reading their own diary — so
 * this is a no-op (returns `{ recorded: false }`) when the viewer owns the entry.
 */
export async function recordView(viewerId: string, catEntryId: string) {
  const entry = await db.catEntry.findUnique({
    where: { id: catEntryId },
    select: { ownerId: true },
  });
  if (!entry) throw new CatEntryNotFoundError();
  if (!(await canViewCatEntry(viewerId, entry.ownerId))) throw new CatEntryForbiddenError();

  if (entry.ownerId === viewerId) {
    return { recorded: false };
  }

  await db.entryView.upsert({
    where: { userId_catEntryId: { userId: viewerId, catEntryId } },
    create: { userId: viewerId, catEntryId },
    update: { count: { increment: 1 }, lastSeenAt: new Date() },
  });

  return { recorded: true };
}
