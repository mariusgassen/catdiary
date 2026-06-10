import { db } from "@/lib/db";
import { canViewCatEntry, CatEntryForbiddenError, CatEntryNotFoundError } from "@/lib/catEntries";

export class CommentNotFoundError extends Error {}

const commentInclude = {
  user: { select: { id: true, displayName: true, avatarKey: true, image: true } },
} as const;

export async function listComments(catEntryId: string, viewerId: string | null) {
  const entry = await db.catEntry.findUnique({ where: { id: catEntryId }, select: { ownerId: true } });
  if (!entry) throw new CatEntryNotFoundError();
  if (!(await canViewCatEntry(viewerId, entry.ownerId))) throw new CatEntryForbiddenError();

  return db.comment.findMany({
    where: { catEntryId },
    orderBy: { createdAt: "asc" },
    include: commentInclude,
  });
}

export async function addComment(userId: string, catEntryId: string, body: string) {
  const entry = await db.catEntry.findUnique({ where: { id: catEntryId }, select: { ownerId: true } });
  if (!entry) throw new CatEntryNotFoundError();
  if (!(await canViewCatEntry(userId, entry.ownerId))) throw new CatEntryForbiddenError();

  return db.comment.create({
    data: { userId, catEntryId, body },
    include: commentInclude,
  });
}

/** A comment can be removed by its author or by the owner of the diary entry. */
export async function deleteComment(commentId: string, userId: string) {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { userId: true, catEntry: { select: { ownerId: true } } },
  });
  if (!comment) throw new CommentNotFoundError();
  if (comment.userId !== userId && comment.catEntry.ownerId !== userId) {
    throw new CatEntryForbiddenError();
  }
  await db.comment.delete({ where: { id: commentId } });
}
