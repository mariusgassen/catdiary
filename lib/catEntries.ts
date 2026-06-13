import { db } from "@/lib/db";
import { MAX_PHOTOS_PER_ENTRY } from "@/lib/photo-urls";
import { createNotification } from "@/lib/notifications";
import type { FrameStyle } from "@/lib/frames";
import type { ReactionBreakdown, ReactionKind } from "@/lib/reactions";

const PAGE_SIZE = 20;

export { MAX_PHOTOS_PER_ENTRY };

export type CatEntryPhotoInput = {
  photoKey: string;
  thumbKey?: string | null;
};

export type CreateCatEntryInput = {
  ownerId: string;
  photos: CatEntryPhotoInput[]; // 1..MAX_PHOTOS_PER_ENTRY, in display order
  name?: string | null;
  breed?: string | null;
  notes?: string | null;
  locationName?: string | null;
  latitude?: number | null; // null = user disabled geo data for this entry
  longitude?: number | null;
  frameStyle?: FrameStyle;
};

export class CatEntryNotFoundError extends Error {}
export class CatEntryForbiddenError extends Error {}

export type UpdateCatEntryInput = {
  name?: string | null;
  breed?: string | null;
  notes?: string | null;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  frameStyle?: FrameStyle;
  catId?: string | null; // link this sighting to one of the owner's cats (null = unlink)
};

export class CatEntryPhotoCountError extends Error {}

export async function createCatEntry(input: CreateCatEntryInput) {
  if (input.photos.length < 1 || input.photos.length > MAX_PHOTOS_PER_ENTRY) {
    throw new CatEntryPhotoCountError(`an entry needs 1–${MAX_PHOTOS_PER_ENTRY} photos`);
  }

  const entry = await db.catEntry.create({
    data: {
      ownerId: input.ownerId,
      name: input.name ?? null,
      breed: input.breed ?? null,
      notes: input.notes ?? null,
      locationName: input.locationName ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      frameStyle: input.frameStyle ?? "POLAROID",
      photos: {
        create: input.photos.map((photo, position) => ({
          photoKey: photo.photoKey,
          thumbKey: photo.thumbKey ?? null,
          position,
        })),
      },
    },
    include: { photos: { orderBy: { position: "asc" } } },
  });

  // Notify @mentioned users in the caption
  if (input.notes) {
    const mentionedUsernames = (input.notes.match(/@([\w.]+)/g) ?? []).map((m) => m.slice(1));
    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await db.user.findMany({
        where: { username: { in: [...new Set(mentionedUsernames)] } },
        select: { id: true },
      });
      for (const mentioned of mentionedUsers) {
        void createNotification({
          userId: mentioned.id,
          actorId: input.ownerId,
          type: "MENTION",
          catEntryId: entry.id,
        });
      }
    }
  }

  return entry;
}

/** Fetches a CatEntry (with its cover photo) only if `ownerId` owns it — used
    for the edit flow, which previews frame styles on the cover. */
export async function getOwnedCatEntry(entryId: string, ownerId: string) {
  const entry = await db.catEntry.findUnique({
    where: { id: entryId },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
  });
  if (!entry || entry.ownerId !== ownerId) return null;
  return entry;
}

export async function updateCatEntry(entryId: string, ownerId: string, input: UpdateCatEntryInput) {
  const entry = await db.catEntry.findUnique({ where: { id: entryId }, select: { ownerId: true } });
  if (!entry) throw new CatEntryNotFoundError();
  if (entry.ownerId !== ownerId) throw new CatEntryForbiddenError();

  // You may only file a sighting under one of your own cats.
  if (input.catId) {
    const cat = await db.cat.findUnique({ where: { id: input.catId }, select: { ownerId: true } });
    if (!cat || cat.ownerId !== ownerId) throw new CatEntryForbiddenError();
  }

  return db.catEntry.update({ where: { id: entryId }, data: input });
}

export async function deleteCatEntry(entryId: string, ownerId: string) {
  const entry = await db.catEntry.findUnique({
    where: { id: entryId },
    select: { ownerId: true, photos: { select: { photoKey: true, thumbKey: true } } },
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

/** True if `viewerId` may see entries owned by `ownerId` (self, public, or approved follower). */
export async function canViewCatEntry(viewerId: string | null, ownerId: string): Promise<boolean> {
  const ids = await listVisibleOwnerIds(viewerId, ownerId);
  return ids.length > 0;
}

/**
 * Fetches a single entry for the detail page, enforcing visibility. Includes
 * the owner, like/comment counts and whether the viewer has liked it.
 */
export async function getCatEntryForViewer(entryId: string, viewerId: string | null) {
  const entry = await db.catEntry.findUnique({
    where: { id: entryId },
    include: {
      photos: { orderBy: { position: "asc" } },
      owner: { select: { id: true, username: true, displayName: true, avatarKey: true, image: true } },
      cat: { select: { id: true, name: true, isOwned: true } },
      _count: { select: { likes: true, comments: true } },
      likes: viewerId ? { where: { userId: viewerId }, select: { userId: true, kind: true } } : false,
    },
  });
  if (!entry) return null;
  if (!(await canViewCatEntry(viewerId, entry.ownerId))) return null;

  // The per-stamp breakdown is the owner's to see — never surfaced publicly.
  const reactionBreakdown =
    viewerId === entry.ownerId ? await listReactionBreakdown(entry.id) : null;
  return { ...entry, reactionBreakdown };
}

/**
 * The per-stamp reaction tally for an entry — the audience breakdown shown only
 * to the owner. Deliberately never exposed publicly: a public entry shows one
 * total count, never a per-reaction leaderboard.
 */
export async function listReactionBreakdown(catEntryId: string): Promise<ReactionBreakdown> {
  const rows = await db.like.groupBy({
    by: ["kind"],
    where: { catEntryId },
    _count: { kind: true },
  });
  return rows.map((r) => ({ kind: r.kind as ReactionKind, count: r._count.kind }));
}

export async function storeCatEntryEmbedding(entryId: string, embedding: number[]): Promise<void> {
  const vec = `[${embedding.join(",")}]`;
  await db.$executeRaw`UPDATE cat_entries SET embedding = ${vec}::vector WHERE id = ${entryId}`;
}

type SimilarEntry = {
  id: string;
  ownerId: string;
  photoKey: string | null;
  thumbKey: string | null;
  name: string | null;
  breed: string | null;
  createdAt: Date;
  ownerDisplayName: string | null;
  ownerUsername: string | null;
  ownerAvatarKey: string | null;
  ownerImage: string | null;
};

export async function getSimilarCatEntries(
  entryId: string,
  viewerId: string | null,
): Promise<SimilarEntry[]> {
  const source = await db.$queryRaw<Array<{ embedding: string | null }>>`
    SELECT embedding::text FROM cat_entries WHERE id = ${entryId}
  `;
  const embeddingStr = source[0]?.embedding;
  if (!embeddingStr) return [];

  const ownerIds = await listVisibleOwnerIds(viewerId);
  if (ownerIds.length === 0) return [];

  return db.$queryRaw<SimilarEntry[]>`
    SELECT
      ce.id,
      ce.owner_id      AS "ownerId",
      cover.photo_key  AS "photoKey",
      cover.thumb_key  AS "thumbKey",
      ce.name,
      ce.breed,
      ce.created_at    AS "createdAt",
      u.display_name   AS "ownerDisplayName",
      u.username       AS "ownerUsername",
      u.avatar_key     AS "ownerAvatarKey",
      u.image          AS "ownerImage"
    FROM cat_entries ce
    JOIN users u ON u.id = ce.owner_id
    LEFT JOIN LATERAL (
      SELECT p.photo_key, p.thumb_key
      FROM cat_entry_photos p
      WHERE p.cat_entry_id = ce.id
      ORDER BY p.position ASC
      LIMIT 1
    ) cover ON TRUE
    WHERE ce.id != ${entryId}
      AND ce.owner_id = ANY(${ownerIds}::text[])
      AND ce.embedding IS NOT NULL
    -- cosine distance: matches the metric of cat_entries_embedding_hnsw_idx
    ORDER BY ce.embedding <=> ${embeddingStr}::vector
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
      photos: { orderBy: { position: "asc" } },
      owner: { select: { id: true, username: true, displayName: true, avatarKey: true, image: true } },
      _count: { select: { likes: true, comments: true } },
      // Only the viewer's own like row — lets the UI render initial like state.
      likes: opts.viewerId ? { where: { userId: opts.viewerId }, select: { userId: true, kind: true } } : false,
    },
  });

  let nextCursor: string | null = null;
  if (entries.length > PAGE_SIZE) {
    nextCursor = entries.pop()!.id;
  }

  return { entries, nextCursor };
}

export type MapEntry = {
  id: string;
  latitude: number;
  longitude: number;
  locationName: string | null;
  name: string | null;
  breed: string | null;
  thumbKey: string | null;
};

/** Returns all visible entries that have coordinates, for the map tab. */
export async function listCatEntriesForMap(viewerId: string | null): Promise<MapEntry[]> {
  const ownerIds = await listVisibleOwnerIds(viewerId);
  if (ownerIds.length === 0) return [];

  const entries = await db.catEntry.findMany({
    where: {
      ownerId: { in: ownerIds },
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      locationName: true,
      name: true,
      breed: true,
      photos: {
        orderBy: { position: "asc" },
        take: 1,
        select: { thumbKey: true, photoKey: true },
      },
    },
  });

  return entries.map((e) => ({
    id: e.id,
    latitude: e.latitude!,
    longitude: e.longitude!,
    locationName: e.locationName,
    name: e.name,
    breed: e.breed,
    thumbKey: e.photos[0]?.thumbKey ?? e.photos[0]?.photoKey ?? null,
  }));
}

/**
 * Counts hashtag usage across recent visible entries and returns the top ones.
 * Scans the last 500 entries so fresh trends surface quickly without a full-table scan.
 */
export async function getTrendingHashtags(viewerId: string | null, limit = 8): Promise<string[]> {
  const ownerIds = await listVisibleOwnerIds(viewerId);
  if (ownerIds.length === 0) return [];

  const entries = await db.catEntry.findMany({
    where: { ownerId: { in: ownerIds }, notes: { not: null } },
    select: { notes: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const counts = new Map<string, number>();
  for (const { notes } of entries) {
    if (!notes) continue;
    const tags = notes.match(/#[\wÀ-ɏ]+/g) ?? [];
    for (const tag of tags) {
      const lower = tag.toLowerCase();
      counts.set(lower, (counts.get(lower) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

/**
 * Returns up to `limit` visible entries logged on the same month/day in any
 * previous year — used for the "On This Day" feed strip.
 */
export async function listOnThisDayEntries(viewerId: string | null, limit = 6) {
  const ownerIds = await listVisibleOwnerIds(viewerId);
  if (ownerIds.length === 0) return [];

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const currentYear = now.getFullYear();

  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM cat_entries
    WHERE owner_id = ANY(${ownerIds}::text[])
      AND EXTRACT(MONTH FROM created_at)::int = ${month}
      AND EXTRACT(DAY FROM created_at)::int = ${day}
      AND EXTRACT(YEAR FROM created_at)::int < ${currentYear}
    ORDER BY created_at DESC
    LIMIT 6
  `;

  if (rows.length === 0) return [];

  const entries = await db.catEntry.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: {
      photos: { orderBy: { position: "asc" } },
      owner: { select: { id: true, username: true, displayName: true, avatarKey: true, image: true } },
      _count: { select: { likes: true, comments: true } },
      likes: viewerId ? { where: { userId: viewerId }, select: { userId: true, kind: true } } : false,
    },
  });

  const idOrder = new Map(rows.map((r, i) => [r.id, i]));
  return entries.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
}

export type NearbyEntry = {
  id: string;
  name: string | null;
  breed: string | null;
  notes: string | null;
  locationName: string | null;
  latitude: number;
  longitude: number;
  createdAt: Date;
  distanceKm: number;
  owner: { id: string; username: string | null; displayName: string | null; avatarKey: string | null; image: string | null };
  photos: { id: string; catEntryId: string; photoKey: string; thumbKey: string | null; position: number }[];
  _count: { likes: number; comments: number };
  likes: { userId: string; kind: ReactionKind }[];
};

/**
 * Returns up to 30 visible entries within `radiusKm` of the given coordinates,
 * ordered closest-first. Uses the Haversine formula in a raw query since
 * Prisma doesn't support computed-column filtering natively.
 */
export async function listNearbyCatEntries(opts: {
  lat: number;
  lng: number;
  radiusKm: number;
  viewerId: string | null;
}): Promise<NearbyEntry[]> {
  const { lat, lng, radiusKm, viewerId } = opts;
  const ownerIds = await listVisibleOwnerIds(viewerId);
  if (ownerIds.length === 0) return [];

  const rows = await db.$queryRaw<{ id: string; distance_km: number }[]>`
    SELECT id,
      (6371.0 * 2.0 * ASIN(SQRT(
        POWER(SIN(RADIANS((${lat}::double precision - latitude) / 2.0)), 2) +
        COS(RADIANS(latitude)) * COS(RADIANS(${lat}::double precision)) *
        POWER(SIN(RADIANS((${lng}::double precision - longitude) / 2.0)), 2)
      )))::double precision AS distance_km
    FROM cat_entries
    WHERE owner_id = ANY(${ownerIds}::text[])
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND (6371.0 * 2.0 * ASIN(SQRT(
        POWER(SIN(RADIANS((${lat}::double precision - latitude) / 2.0)), 2) +
        COS(RADIANS(latitude)) * COS(RADIANS(${lat}::double precision)) *
        POWER(SIN(RADIANS((${lng}::double precision - longitude) / 2.0)), 2)
      ))) <= ${radiusKm}::double precision
    ORDER BY distance_km ASC
    LIMIT 30
  `;

  if (rows.length === 0) return [];

  const distanceMap = new Map(rows.map((r) => [r.id, Number(r.distance_km)]));

  const entries = await db.catEntry.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: {
      photos: { orderBy: { position: "asc" } },
      owner: { select: { id: true, username: true, displayName: true, avatarKey: true, image: true } },
      _count: { select: { likes: true, comments: true } },
      likes: viewerId ? { where: { userId: viewerId }, select: { userId: true, kind: true } } : false,
    },
  });

  return entries
    .map((e) => ({
      ...e,
      latitude: e.latitude!,
      longitude: e.longitude!,
      distanceKm: distanceMap.get(e.id) ?? 0,
      likes: (Array.isArray(e.likes) ? e.likes : []) as { userId: string; kind: ReactionKind }[],
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Returns `limit` random public cat entries — used for the Discover page
 * empty state. Uses ORDER BY RANDOM() so every load shows a different set.
 */
export async function listRandomCatEntries(viewerId: string | null, limit = 24) {
  const ownerIds = await listVisibleOwnerIds(viewerId);
  if (ownerIds.length === 0) return [];

  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM cat_entries
    WHERE owner_id = ANY(${ownerIds}::text[])
    ORDER BY RANDOM()
    LIMIT ${limit}
  `;

  if (rows.length === 0) return [];

  const entries = await db.catEntry.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: {
      photos: { orderBy: { position: "asc" }, take: 1 },
      owner: { select: { id: true } },
    },
  });

  // Restore random order (findMany doesn't preserve IN order)
  const idOrder = new Map(rows.map((r, i) => [r.id, i]));
  return entries.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
}
