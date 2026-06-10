import { db } from "@/lib/db";
import { canViewCatEntry, CatEntryForbiddenError, CatEntryNotFoundError } from "@/lib/catEntries";

export class CommentNotFoundError extends Error {}

const commentInclude = {
  user: { select: { id: true, username: true, displayName: true, avatarKey: true, image: true } },
} as const;

/**
 * Comments are threaded one level deep: `parentId` always points at a
 * top-level comment (the thread root). Replying to a reply joins the same
 * thread, so storage matches the max display depth of 2.
 */
export async function listComments(catEntryId: string, viewerId: string | null) {
  const entry = await db.catEntry.findUnique({ where: { id: catEntryId }, select: { ownerId: true } });
  if (!entry) throw new CatEntryNotFoundError();
  if (!(await canViewCatEntry(viewerId, entry.ownerId))) throw new CatEntryForbiddenError();

  const flat = await db.comment.findMany({
    where: { catEntryId },
    orderBy: { createdAt: "asc" },
    include: commentInclude,
  });

  // Group into threads: roots in posting order, replies in order within each.
  type FlatComment = (typeof flat)[number];
  type Thread = FlatComment & { replies: FlatComment[] };
  const roots: Thread[] = [];
  const threadById = new Map<string, Thread>();
  for (const comment of flat) {
    if (!comment.parentId) {
      const thread = { ...comment, replies: [] };
      roots.push(thread);
      threadById.set(comment.id, thread);
    }
  }
  for (const comment of flat) {
    if (comment.parentId) threadById.get(comment.parentId)?.replies.push(comment);
  }
  return roots;
}

export async function addComment(
  userId: string,
  catEntryId: string,
  body: string,
  parentId?: string | null,
) {
  const entry = await db.catEntry.findUnique({ where: { id: catEntryId }, select: { ownerId: true } });
  if (!entry) throw new CatEntryNotFoundError();
  if (!(await canViewCatEntry(userId, entry.ownerId))) throw new CatEntryForbiddenError();

  let rootId: string | null = null;
  if (parentId) {
    const parent = await db.comment.findUnique({
      where: { id: parentId },
      select: { id: true, catEntryId: true, parentId: true },
    });
    if (!parent || parent.catEntryId !== catEntryId) throw new CommentNotFoundError();
    rootId = parent.parentId ?? parent.id;
  }

  return db.comment.create({
    data: { userId, catEntryId, body, parentId: rootId },
    include: commentInclude,
  });
}

/** A comment can be removed by its author or by the owner of the diary entry.
 *  Removing a thread root cascade-deletes its replies. */
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
