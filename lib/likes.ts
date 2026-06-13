import { db } from "@/lib/db";
import { canViewCatEntry, CatEntryForbiddenError, CatEntryNotFoundError } from "@/lib/catEntries";
import { createNotification } from "@/lib/notifications";
import { type ReactionKind } from "@/lib/reactions";

/**
 * Sets `userId`'s reaction (a themed stamp) on an entry. The viewer must be
 * allowed to see the entry (self, public owner, or approved follower) to react.
 *
 * One reaction per (user, entry): tapping the stamp you already left removes it
 * (toggle off), picking a different stamp replaces the previous one, and the
 * first reaction notifies the owner. Switching stamps doesn't re-notify.
 */
export async function setReaction(userId: string, catEntryId: string, kind: ReactionKind) {
  const entry = await db.catEntry.findUnique({ where: { id: catEntryId }, select: { ownerId: true } });
  if (!entry) throw new CatEntryNotFoundError();
  if (!(await canViewCatEntry(userId, entry.ownerId))) throw new CatEntryForbiddenError();

  const existing = await db.like.findUnique({
    where: { userId_catEntryId: { userId, catEntryId } },
    select: { kind: true },
  });

  let reacted: boolean;
  let resultKind: ReactionKind | null;

  if (existing && existing.kind === kind) {
    await db.like.delete({ where: { userId_catEntryId: { userId, catEntryId } } });
    reacted = false;
    resultKind = null;
  } else if (existing) {
    await db.like.update({ where: { userId_catEntryId: { userId, catEntryId } }, data: { kind } });
    reacted = true;
    resultKind = kind;
  } else {
    await db.like.create({ data: { userId, catEntryId, kind } });
    reacted = true;
    resultKind = kind;
    void createNotification({ userId: entry.ownerId, actorId: userId, type: "LIKE", catEntryId });
  }

  const total = await db.like.count({ where: { catEntryId } });
  return { reacted, kind: resultKind, total };
}
