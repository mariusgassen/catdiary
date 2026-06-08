import { db } from "@/lib/db";

const PAGE_SIZE = 20;

export type CreateCatEntryInput = {
  ownerId: string;
  photoKey: string;
  thumbKey?: string | null;
  name?: string | null;
  breed?: string | null;
  notes?: string | null;
  latitude: number;
  longitude: number;
};

export async function createCatEntry(input: CreateCatEntryInput) {
  return db.catEntry.create({
    data: {
      ownerId: input.ownerId,
      photoKey: input.photoKey,
      thumbKey: input.thumbKey ?? null,
      name: input.name ?? null,
      breed: input.breed ?? null,
      notes: input.notes ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
    },
  });
}

/**
 * Returns the set of owner ids whose CatEntries `viewerId` is allowed to see:
 * themselves, plus any owner who is public or who has approved `viewerId`'s
 * follow request. This is the single place visibility rules are enforced —
 * every entry-listing path (feed, profile, API) must go through it.
 */
async function listVisibleOwnerIds(viewerId: string | null, ownerId?: string): Promise<string[]> {
  if (ownerId) {
    if (viewerId === ownerId) return [ownerId];

    const owner = await db.user.findUnique({ where: { id: ownerId }, select: { isPrivate: true } });
    if (!owner) return [];
    if (!owner.isPrivate) return [ownerId];

    if (!viewerId) return [];
    const follow = await db.follow.findUnique({
      where: { followerId_followeeId: { followerId: viewerId, followeeId: ownerId } },
    });
    return follow?.approved ? [ownerId] : [];
  }

  // Feed: public users, plus private users the viewer follows (approved).
  const publicOwners = await db.user.findMany({ where: { isPrivate: false }, select: { id: true } });
  const ids = new Set(publicOwners.map((u) => u.id));

  if (viewerId) {
    ids.add(viewerId);
    const approvedFollows = await db.follow.findMany({
      where: { followerId: viewerId, approved: true },
      select: { followeeId: true },
    });
    approvedFollows.forEach((f) => ids.add(f.followeeId));
  }

  return [...ids];
}

export async function listCatEntriesForViewer(opts: {
  viewerId: string | null;
  ownerId?: string;
  cursor?: string;
}) {
  const ownerIds = await listVisibleOwnerIds(opts.viewerId, opts.ownerId);
  if (ownerIds.length === 0) {
    return { entries: [], nextCursor: null as string | null };
  }

  const entries = await db.catEntry.findMany({
    where: { ownerId: { in: ownerIds } },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: {
      owner: { select: { id: true, displayName: true, avatarKey: true, image: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  let nextCursor: string | null = null;
  if (entries.length > PAGE_SIZE) {
    nextCursor = entries.pop()!.id;
  }

  return { entries, nextCursor };
}
