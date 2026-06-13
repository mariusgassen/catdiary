import { db } from "@/lib/db";
import { canViewCatEntry, listVisibleOwnerIds } from "@/lib/catEntries";
import { createNotification } from "@/lib/notifications";

// Business logic for the persistent `Cat` profile — a named cat that one or
// more sightings (`CatEntry`) point at. A cat belongs to the user who created
// it; its visibility follows that owner's profile visibility, reusing
// `canViewCatEntry` (the single source of truth for "may this viewer see this
// owner's cats?"). A cat has no avatar of its own: its photo is drawn from the
// cover of its most recent linked sighting.

export class CatNotFoundError extends Error {}
export class CatForbiddenError extends Error {}

export type CreateCatInput = {
  ownerId: string;
  name: string;
  breed?: string | null;
  color?: string | null;
  description?: string | null;
  isOwned?: boolean;
};

export type UpdateCatInput = {
  name?: string;
  breed?: string | null;
  color?: string | null;
  description?: string | null;
  isOwned?: boolean;
};

/** A cat plus its derived cover photo and sighting count, for lists/headers. */
export type CatSummary = {
  id: string;
  ownerId: string;
  name: string;
  breed: string | null;
  color: string | null;
  description: string | null;
  isOwned: boolean;
  createdAt: Date;
  entryCount: number;
  coverPhotoKey: string | null;
  coverThumbKey: string | null;
};

// Selects a cat with the cover of its most recent sighting and its sighting
// count — the shape every read path returns via `toSummary`.
const catWithCover = {
  entries: {
    orderBy: { createdAt: "desc" } as const,
    take: 1,
    select: {
      photos: {
        orderBy: { position: "asc" } as const,
        take: 1,
        select: { photoKey: true, thumbKey: true },
      },
    },
  },
  _count: { select: { entries: true } },
};

type CatRow = {
  id: string;
  ownerId: string;
  name: string;
  breed: string | null;
  color: string | null;
  description: string | null;
  isOwned: boolean;
  createdAt: Date;
  _count: { entries: number };
  entries: { photos: { photoKey: string; thumbKey: string | null }[] }[];
};

function toSummary(cat: CatRow): CatSummary {
  const cover = cat.entries[0]?.photos[0] ?? null;
  return {
    id: cat.id,
    ownerId: cat.ownerId,
    name: cat.name,
    breed: cat.breed,
    color: cat.color,
    description: cat.description,
    isOwned: cat.isOwned,
    createdAt: cat.createdAt,
    entryCount: cat._count.entries,
    coverPhotoKey: cover?.photoKey ?? null,
    coverThumbKey: cover?.thumbKey ?? null,
  };
}

export async function createCat(input: CreateCatInput) {
  return db.cat.create({
    data: {
      ownerId: input.ownerId,
      name: input.name,
      breed: input.breed ?? null,
      color: input.color ?? null,
      description: input.description ?? null,
      isOwned: input.isOwned ?? false,
    },
  });
}

export async function updateCat(catId: string, ownerId: string, input: UpdateCatInput) {
  const cat = await db.cat.findUnique({ where: { id: catId }, select: { ownerId: true } });
  if (!cat) throw new CatNotFoundError();
  if (cat.ownerId !== ownerId) throw new CatForbiddenError();

  return db.cat.update({ where: { id: catId }, data: input });
}

/** Deletes a cat; its sightings are kept and simply unlinked (FK `SET NULL`). */
export async function deleteCat(catId: string, ownerId: string) {
  const cat = await db.cat.findUnique({ where: { id: catId }, select: { ownerId: true } });
  if (!cat) throw new CatNotFoundError();
  if (cat.ownerId !== ownerId) throw new CatForbiddenError();

  await db.cat.delete({ where: { id: catId } });
}

/** Fetches a cat only if `ownerId` owns it — used by the edit form. */
export async function getOwnedCat(catId: string, ownerId: string) {
  const cat = await db.cat.findUnique({ where: { id: catId } });
  if (!cat || cat.ownerId !== ownerId) return null;
  return cat;
}

/** A single cat for its profile page, visibility-checked against the owner. */
export async function getCatForViewer(catId: string, viewerId: string | null): Promise<CatSummary | null> {
  const cat = await db.cat.findUnique({
    where: { id: catId },
    include: catWithCover,
  });
  if (!cat) return null;
  if (!(await canViewCatEntry(viewerId, cat.ownerId))) return null;
  return toSummary(cat as CatRow);
}

/** The cats `ownerId` has profiled, if the viewer may see that owner's diary. */
export async function listCatsForOwner(ownerId: string, viewerId: string | null): Promise<CatSummary[]> {
  if (!(await canViewCatEntry(viewerId, ownerId))) return [];

  const cats = await db.cat.findMany({
    where: { ownerId },
    orderBy: [{ isOwned: "desc" }, { createdAt: "desc" }],
    include: catWithCover,
  });
  return cats.map((c) => toSummary(c as CatRow));
}

/**
 * The sighting timeline of a single cat, newest first — visibility-checked.
 * Sightings may be contributed by multiple people once cross-person "same cat?"
 * links are approved, so each entry is filtered by *its own* owner's visibility
 * (not just the cat owner's): the viewer sees only the contributions they're
 * allowed to.
 */
export async function listEntriesForCat(catId: string, viewerId: string | null) {
  const cat = await db.cat.findUnique({ where: { id: catId }, select: { ownerId: true } });
  if (!cat) return [];
  if (!(await canViewCatEntry(viewerId, cat.ownerId))) return [];

  const visibleOwnerIds = await listVisibleOwnerIds(viewerId);

  return db.catEntry.findMany({
    where: { catId, ownerId: { in: visibleOwnerIds } },
    orderBy: { createdAt: "desc" },
    include: {
      photos: { orderBy: { position: "asc" } },
      owner: { select: { id: true, username: true, displayName: true, avatarKey: true, image: true } },
      _count: { select: { likes: true, comments: true } },
      likes: viewerId ? { where: { userId: viewerId }, select: { userId: true, kind: true } } : false,
    },
  });
}

/**
 * Links (or unlinks, with `catId = null`) one of the owner's sightings to one
 * of the owner's *own* cats. Both the entry and the cat must belong to
 * `ownerId` — filing under someone else's cat goes through `requestCatLink`
 * (the approval flow). Unlinking also clears any cross-person link rows so the
 * sighting drops off a shared cat's timeline.
 */
export async function setEntryCat(entryId: string, ownerId: string, catId: string | null) {
  const entry = await db.catEntry.findUnique({ where: { id: entryId }, select: { ownerId: true } });
  if (!entry) throw new CatNotFoundError();
  if (entry.ownerId !== ownerId) throw new CatForbiddenError();

  if (catId !== null) {
    const cat = await db.cat.findUnique({ where: { id: catId }, select: { ownerId: true } });
    if (!cat) throw new CatNotFoundError();
    if (cat.ownerId !== ownerId) throw new CatForbiddenError();
  } else {
    // Dropping the link also retracts any approved/pending cross-person claim.
    await db.catLink.deleteMany({ where: { catEntryId: entryId } });
  }

  return db.catEntry.update({ where: { id: entryId }, data: { catId } });
}

// "Close enough" cosine distance for a re-identification suggestion. CLIP
// cosine distance runs ~0.0 (near-identical) to ~0.4+ (clearly different cats);
// this is a deliberately lenient heuristic — it only *suggests*, a human always
// confirms — and is the obvious knob to tune as real data accrues.
const SUGGEST_DISTANCE_THRESHOLD = 0.25;

export type CatSuggestion = {
  catId: string;
  name: string;
  ownerId: string;
  ownerDisplayName: string | null;
  ownerUsername: string | null;
  isOwn: boolean; // true = your cat (one tap files it); false = someone else's (needs their approval)
  coverPhotoKey: string | null;
  coverThumbKey: string | null;
  distance: number;
};

/**
 * "Might this be cat X?" — visual re-identification candidates for a sighting.
 * Looks up the nearest *already-profiled* sightings by CLIP embedding (cosine
 * distance), among diaries the viewer can see, and collapses them to the
 * distinct cats they belong to: your own cats and other people's visible cats
 * alike. Excludes the cat this sighting is already filed under. Returns nothing
 * until the entry's embedding has been computed (it's generated in the
 * background after upload).
 */
export async function suggestCatsForEntry(
  entryId: string,
  viewerId: string | null,
): Promise<CatSuggestion[]> {
  const entry = await db.catEntry.findUnique({
    where: { id: entryId },
    select: { ownerId: true, catId: true },
  });
  if (!entry) return [];
  // Suggestions are for the sighting's owner — they're the only one who can act
  // on them (file it, or ask another diarist to confirm their cat).
  if (viewerId !== entry.ownerId) return [];

  const source = await db.$queryRaw<Array<{ embedding: string | null }>>`
    SELECT embedding::text FROM cat_entries WHERE id = ${entryId}
  `;
  const embeddingStr = source[0]?.embedding;
  if (!embeddingStr) return [];

  const ownerIds = await listVisibleOwnerIds(viewerId);
  if (ownerIds.length === 0) return [];

  const rows = await db.$queryRaw<
    Array<{
      catId: string;
      name: string;
      ownerId: string;
      ownerDisplayName: string | null;
      ownerUsername: string | null;
      coverPhotoKey: string | null;
      coverThumbKey: string | null;
      distance: number;
    }>
  >`
    SELECT s."catId", s.name, s."ownerId", s."ownerDisplayName", s."ownerUsername",
           s."coverPhotoKey", s."coverThumbKey", s.distance
    FROM (
      SELECT DISTINCT ON (ce.cat_id)
        ce.cat_id        AS "catId",
        c.name           AS name,
        c.owner_id       AS "ownerId",
        u.display_name   AS "ownerDisplayName",
        u.username       AS "ownerUsername",
        cover.photo_key  AS "coverPhotoKey",
        cover.thumb_key  AS "coverThumbKey",
        (ce.embedding <=> ${embeddingStr}::vector) AS distance
      FROM cat_entries ce
      JOIN cats c ON c.id = ce.cat_id
      JOIN users u ON u.id = c.owner_id
      LEFT JOIN LATERAL (
        SELECT p.photo_key, p.thumb_key
        FROM cat_entries e2
        JOIN cat_entry_photos p ON p.cat_entry_id = e2.id
        WHERE e2.cat_id = c.id
        ORDER BY e2.created_at DESC, p.position ASC
        LIMIT 1
      ) cover ON TRUE
      WHERE ce.cat_id IS NOT NULL
        AND ce.id != ${entryId}
        AND ce.embedding IS NOT NULL
        AND c.owner_id = ANY(${ownerIds}::text[])
        AND (${entry.catId}::text IS NULL OR ce.cat_id != ${entry.catId})
      ORDER BY ce.cat_id, distance ASC
    ) s
    WHERE s.distance < ${SUGGEST_DISTANCE_THRESHOLD}
    ORDER BY s.distance ASC
    LIMIT 4
  `;

  return rows.map((r) => ({
    catId: r.catId,
    name: r.name,
    ownerId: r.ownerId,
    ownerDisplayName: r.ownerDisplayName,
    ownerUsername: r.ownerUsername,
    isOwn: r.ownerId === entry.ownerId,
    coverPhotoKey: r.coverPhotoKey,
    coverThumbKey: r.coverThumbKey,
    distance: Number(r.distance),
  }));
}

export type CatLinkResult = { status: "APPROVED" | "PENDING" };

/**
 * Claims that `entryId` (the requester's sighting) is the same animal as
 * `catId`. If the cat is the requester's own, the sighting is filed
 * immediately. If it belongs to someone else, a PENDING request is recorded and
 * that owner is notified to approve — you can only see/claim cats in diaries
 * visible to you.
 */
export async function requestCatLink(input: {
  entryId: string;
  catId: string;
  requesterId: string;
}): Promise<CatLinkResult> {
  const { entryId, catId, requesterId } = input;

  const entry = await db.catEntry.findUnique({ where: { id: entryId }, select: { ownerId: true } });
  if (!entry) throw new CatNotFoundError();
  if (entry.ownerId !== requesterId) throw new CatForbiddenError();

  const cat = await db.cat.findUnique({ where: { id: catId }, select: { ownerId: true } });
  if (!cat) throw new CatNotFoundError();
  if (!(await canViewCatEntry(requesterId, cat.ownerId))) throw new CatForbiddenError();

  // Your own cat: no approval needed, file it straight away.
  if (cat.ownerId === requesterId) {
    await db.catEntry.update({ where: { id: entryId }, data: { catId } });
    return { status: "APPROVED" };
  }

  // Someone else's cat: record (or refresh) a pending claim and notify them.
  await db.catLink.upsert({
    where: { catId_catEntryId: { catId, catEntryId: entryId } },
    create: { catId, catEntryId: entryId, requesterId, status: "PENDING" },
    update: { status: "PENDING", requesterId },
  });
  await createNotification({
    userId: cat.ownerId,
    actorId: requesterId,
    type: "CAT_LINK_REQUEST",
    catEntryId: entryId,
    catId,
  });

  return { status: "PENDING" };
}

/**
 * The cat owner approves or declines a "same cat?" claim. On approval the
 * sighting's `catId` is repointed at the cat (joining its timeline) and the
 * requester is notified; on decline the request is just marked DECLINED.
 */
export async function respondToCatLink(input: {
  linkId: string;
  catOwnerId: string;
  approve: boolean;
}) {
  const { linkId, catOwnerId, approve } = input;

  const link = await db.catLink.findUnique({
    where: { id: linkId },
    include: { cat: { select: { ownerId: true } } },
  });
  if (!link) throw new CatNotFoundError();
  if (link.cat.ownerId !== catOwnerId) throw new CatForbiddenError();
  if (link.status !== "PENDING") return link;

  if (approve) {
    await db.$transaction([
      db.catEntry.update({ where: { id: link.catEntryId }, data: { catId: link.catId } }),
      db.catLink.update({ where: { id: linkId }, data: { status: "APPROVED" } }),
    ]);
    await createNotification({
      userId: link.requesterId,
      actorId: catOwnerId,
      type: "CAT_LINK_APPROVED",
      catEntryId: link.catEntryId,
      catId: link.catId,
    });
  } else {
    await db.catLink.update({ where: { id: linkId }, data: { status: "DECLINED" } });
  }

  return link;
}

export type PendingCatLink = {
  id: string;
  createdAt: Date;
  requester: { id: string; username: string | null; displayName: string | null; avatarKey: string | null; image: string | null };
  catEntry: { id: string; name: string | null; photos: { photoKey: string; thumbKey: string | null }[] };
};

/** Pending "same cat?" claims on a cat, for its owner to review on the cat page. */
export async function listPendingCatLinks(catId: string, catOwnerId: string): Promise<PendingCatLink[]> {
  const cat = await db.cat.findUnique({ where: { id: catId }, select: { ownerId: true } });
  if (!cat || cat.ownerId !== catOwnerId) return [];

  return db.catLink.findMany({
    where: { catId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      requester: { select: { id: true, username: true, displayName: true, avatarKey: true, image: true } },
      catEntry: {
        select: {
          id: true,
          name: true,
          photos: { orderBy: { position: "asc" }, take: 1, select: { photoKey: true, thumbKey: true } },
        },
      },
    },
  });
}
