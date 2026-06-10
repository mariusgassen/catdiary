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

export class CatEntryNotFoundError extends Error {}
export class CatEntryForbiddenError extends Error {}

export type UpdateCatEntryInput = {
  name?: string | null;
  breed?: string | null;
  notes?: string | null;
  latitude?: number;
  longitude?: number;
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

/** Fetches a CatEntry only if `ownerId` owns it — used for edit/delete flows. */
export async function getOwnedCatEntry(entryId: string, ownerId: string) {
  const entry = await db.catEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.ownerId !== ownerId) return null;
  return entry;
}

export async function updateCatEntry(entryId: string, ownerId: string, input: UpdateCatEntryInput) {
  const entry = await db.catEntry.findUnique({ where: { id: entryId }, select: { ownerId: true } });
  if (!entry) throw new CatEntryNotFoundError();
  if (entry.ownerId !== ownerId) throw new CatEntryForbiddenError();

  return db.catEntry.update({ where: { id: entryId }, data: input });
}

export async function deleteCatEntry(entryId: string, ownerId: string) {
  const entry = await db.catEntry.findUnique({
    where: { id: entryId },
    select: { ownerId: true, photoKey: true, thumbKey: true },
  });
  if (!entry) throw new CatEntryNotFoundError();
  if (entry.ownerId !== ownerId) throw new CatEntryForbiddenError();

  await db.catEntry.delete({ where: { id: entryId } });
  return entry;
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

export async function storeCatEntryEmbedding(entryId: string, embedding: number[]): Promise<void> {
  const vec = `[${embedding.join(",")}]`;
  await db.$executeRaw`UPDATE "CatEntry" SET embedding = ${vec}::vector WHERE id = ${entryId}`;
}

type SimilarEntry = {
  id: string;
  ownerId: string;
  photoKey: string;
  thumbKey: string | null;
  name: string | null;
  breed: string | null;
  createdAt: Date;
  ownerDisplayName: string;
  ownerAvatarKey: string | null;
  ownerImage: string | null;
};

export async function getSimilarCatEntries(
  entryId: string,
  viewerId: string | null,
): Promise<SimilarEntry[]> {
  const source = await db.$queryRaw<Array<{ embedding: string | null }>>`
    SELECT embedding::text FROM "CatEntry" WHERE id = ${entryId}
  `;
  const embeddingStr = source[0]?.embedding;
  if (!embeddingStr) return [];

  const ownerIds = await listVisibleOwnerIds(viewerId);
  if (ownerIds.length === 0) return [];

  return db.$queryRaw<SimilarEntry[]>`
    SELECT
      ce.id,
      ce."ownerId",
      ce."photoKey",
      ce."thumbKey",
      ce.name,
      ce.breed,
      ce."createdAt",
      u."displayName" AS "ownerDisplayName",
      u."avatarKey"   AS "ownerAvatarKey",
      u.image         AS "ownerImage"
    FROM "CatEntry" ce
    JOIN "User" u ON u.id = ce."ownerId"
    WHERE ce.id != ${entryId}
      AND ce."ownerId" = ANY(${ownerIds}::text[])
      AND ce.embedding IS NOT NULL
    ORDER BY ce.embedding <-> ${embeddingStr}::vector
    LIMIT 6
  `;
}

export async function listCatEntriesForViewer(opts: {
  viewerId: string | null;
  ownerId?: string;
  cursor?: string;
  query?: string;
}) {
  const ownerIds = await listVisibleOwnerIds(opts.viewerId, opts.ownerId);
  if (ownerIds.length === 0) {
    return { entries: [], nextCursor: null as string | null };
  }

  const queryFilter = opts.query
    ? {
        OR: [
          { notes: { contains: opts.query, mode: "insensitive" as const } },
          { name: { contains: opts.query, mode: "insensitive" as const } },
          { breed: { contains: opts.query, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const entries = await db.catEntry.findMany({
    where: { ownerId: { in: ownerIds }, ...queryFilter },
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
