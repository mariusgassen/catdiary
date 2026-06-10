import { db } from "@/lib/db";
import { canViewCatEntry, CatEntryForbiddenError, CatEntryNotFoundError } from "@/lib/catEntries";

/**
 * Toggles `userId`'s paw on an entry. The viewer must be allowed to see the
 * entry (self, public owner, or approved follower) to react to it.
 */
export async function toggleLike(userId: string, catEntryId: string) {
  const entry = await db.catEntry.findUnique({ where: { id: catEntryId }, select: { ownerId: true } });
  if (!entry) throw new CatEntryNotFoundError();
  if (!(await canViewCatEntry(userId, entry.ownerId))) throw new CatEntryForbiddenError();

  const existing = await db.like.findUnique({
    where: { userId_catEntryId: { userId, catEntryId } },
  });

  if (existing) {
    await db.like.delete({ where: { userId_catEntryId: { userId, catEntryId } } });
  } else {
    await db.like.create({ data: { userId, catEntryId } });
  }

  const likeCount = await db.like.count({ where: { catEntryId } });
  return { liked: !existing, likeCount };
}
