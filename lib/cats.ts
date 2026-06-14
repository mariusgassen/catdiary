import { db } from "@/lib/db";
import { canViewCatEntry, listVisibleOwnerIds } from "@/lib/catEntries";
import { createNotification } from "@/lib/notifications";

// Business logic for the `Cat` entity. A cat is a *shared, ownerless cluster of
// linked sightings* (`CatEntry`): linking sightings together never makes you
// its owner. `ownerId` is set only when someone **claims** the cat as their pet
// (`claimCat`). A cat has no canonical name — its names are the distinct names
// people gave its linked sightings ("aliases"). Visibility: a claimed cat
// follows its owner's diary visibility; an ownerless cluster is visible to
// anyone who can see at least one of its sightings. The cat's photo is the
// cover of its most recent *visible* sighting (no separate avatar upload).

export class CatNotFoundError extends Error {}
export class CatForbiddenError extends Error {}

export type CreateCatInput = {
  ownerId: string;
  name: string;
  breed?: string | null;
  color?: string | null;
  description?: string | null;
};

export type UpdateCatInput = {
  name?: string | null;
  breed?: string | null;
  color?: string | null;
  description?: string | null;
};

/** A cat plus its derived cover photo, aliases and visible sighting count. */
export type CatSummary = {
  id: string;
  ownerId: string | null; // null = ownerless cluster
  isOwned: boolean; // claimed as someone's pet
  name: string | null; // optional owner-set name
  aliases: string[]; // distinct names from visible linked sightings
  displayName: string | null; // name ?? aliases[0] ?? null
  breed: string | null;
  color: string | null;
  description: string | null;
  createdAt: Date;
  entryCount: number; // visible sightings only
  coverPhotoKey: string | null;
  coverThumbKey: string | null;
};

type CatScalars = {
  id: string;
  ownerId: string | null;
  isOwned: boolean;
  name: string | null;
  breed: string | null;
  color: string | null;
  description: string | null;
  createdAt: Date;
};

/**
 * Builds summaries for a batch of cats, deriving cover, sighting count and
 * aliases from the cats' *visible* sightings in a single query — so private
 * contributions never leak into a cat's name, count or cover photo.
 */
async function summarize(cats: CatScalars[], viewerId: string | null): Promise<CatSummary[]> {
  if (cats.length === 0) return [];
  const visibleOwnerIds = await listVisibleOwnerIds(viewerId);
  const entries = await db.catEntry.findMany({
    where: { catId: { in: cats.map((c) => c.id) }, ownerId: { in: visibleOwnerIds } },
    orderBy: { createdAt: "desc" },
    select: {
      catId: true,
      name: true,
      photos: { orderBy: { position: "asc" }, take: 1, select: { photoKey: true, thumbKey: true } },
    },
  });

  const byCat = new Map<string, typeof entries>();
  for (const e of entries) {
    if (!e.catId) continue;
    (byCat.get(e.catId) ?? byCat.set(e.catId, []).get(e.catId)!).push(e);
  }

  return cats.map((cat) => {
    const own = byCat.get(cat.id) ?? [];
    const cover = own[0]?.photos[0] ?? null;
    // own is newest-first; build aliases oldest-first for a stable reading order.
    const aliases: string[] = [];
    for (const e of [...own].reverse()) {
      const n = e.name?.trim();
      if (n && !aliases.includes(n)) aliases.push(n);
    }
    return {
      id: cat.id,
      ownerId: cat.ownerId,
      isOwned: cat.isOwned,
      name: cat.name,
      aliases,
      displayName: cat.name ?? aliases[0] ?? null,
      breed: cat.breed,
      color: cat.color,
      description: cat.description,
      createdAt: cat.createdAt,
      entryCount: own.length,
      coverPhotoKey: cover?.photoKey ?? null,
      coverThumbKey: cover?.thumbKey ?? null,
    };
  });
}

/** Manually creating a cat declares it your pet — you become its owner. */
export async function createCat(input: CreateCatInput) {
  return db.cat.create({
    data: {
      ownerId: input.ownerId,
      isOwned: true,
      name: input.name,
      breed: input.breed ?? null,
      color: input.color ?? null,
      description: input.description ?? null,
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

/**
 * A single cat for its profile page. A claimed cat is visible per its owner's
 * diary; an ownerless cluster is visible whenever it has at least one sighting
 * the viewer is allowed to see.
 */
export async function getCatForViewer(catId: string, viewerId: string | null): Promise<CatSummary | null> {
  const cat = await db.cat.findUnique({ where: { id: catId } });
  if (!cat) return null;
  if (cat.ownerId && !(await canViewCatEntry(viewerId, cat.ownerId))) return null;

  const [summary] = await summarize([cat], viewerId);
  // An ownerless cluster with nothing visible isn't shown to this viewer.
  if (!cat.ownerId && summary.entryCount === 0) return null;
  return summary;
}

/** The cats `ownerId` has *claimed* (owns) — used by the file-under picker. */
export async function listCatsForOwner(ownerId: string, viewerId: string | null): Promise<CatSummary[]> {
  if (!(await canViewCatEntry(viewerId, ownerId))) return [];

  const cats = await db.cat.findMany({
    where: { ownerId },
    orderBy: [{ isOwned: "desc" }, { createdAt: "desc" }],
  });
  return summarize(cats, viewerId);
}

/**
 * The cats shown on a diary: ones the profile user has claimed, plus the
 * ownerless clusters their sightings belong to ("cats they've met").
 */
export async function listCatsForProfile(profileId: string, viewerId: string | null): Promise<CatSummary[]> {
  if (!(await canViewCatEntry(viewerId, profileId))) return [];

  const clusterRows = await db.catEntry.findMany({
    where: { ownerId: profileId, catId: { not: null } },
    select: { catId: true },
    distinct: ["catId"],
  });
  const ids = new Set<string>(clusterRows.map((r) => r.catId!));
  const owned = await db.cat.findMany({ where: { ownerId: profileId }, select: { id: true } });
  owned.forEach((c) => ids.add(c.id));
  if (ids.size === 0) return [];

  const cats = await db.cat.findMany({
    where: { id: { in: [...ids] } },
    orderBy: [{ isOwned: "desc" }, { createdAt: "desc" }],
  });
  return summarize(cats, viewerId);
}

/** Claim an *ownerless* cat as your pet — you become its owner. */
export async function claimCat(catId: string, userId: string): Promise<CatSummary | null> {
  const cat = await db.cat.findUnique({ where: { id: catId }, select: { ownerId: true } });
  if (!cat) throw new CatNotFoundError();
  if (cat.ownerId) throw new CatForbiddenError(); // already someone's pet
  await db.cat.update({ where: { id: catId }, data: { ownerId: userId, isOwned: true } });
  return getCatForViewer(catId, userId);
}

/**
 * Merge `sourceCatId` into `targetCatId`: every sighting and pending claim moves
 * to the target, then the source cat is deleted. You must own the target; the
 * source must be ownerless or also yours. This is how "claim & merge" folds a
 * cluster into a cat you already keep.
 */
export async function mergeCats(sourceCatId: string, targetCatId: string, userId: string) {
  if (sourceCatId === targetCatId) throw new CatForbiddenError();
  const [source, target] = await Promise.all([
    db.cat.findUnique({ where: { id: sourceCatId }, select: { ownerId: true } }),
    db.cat.findUnique({ where: { id: targetCatId }, select: { ownerId: true } }),
  ]);
  if (!source || !target) throw new CatNotFoundError();
  if (target.ownerId !== userId) throw new CatForbiddenError();
  if (source.ownerId && source.ownerId !== userId) throw new CatForbiddenError();

  await db.$transaction([
    db.catEntry.updateMany({ where: { catId: sourceCatId }, data: { catId: targetCatId } }),
    db.catLink.deleteMany({ where: { catId: sourceCatId } }),
    db.cat.delete({ where: { id: sourceCatId } }),
  ]);
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
  // A claimed cat is gated by its owner's visibility; an ownerless cluster is
  // open, with each sighting filtered by its own owner below.
  if (cat.ownerId && !(await canViewCatEntry(viewerId, cat.ownerId))) return [];

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
 * Files (or unlinks, with `catId = null`) one of the owner's sightings under a
 * cat. You may file your own sighting under one of *your own* cats or any
 * **ownerless** cluster (a shared identity) — filing under someone else's
 * claimed cat goes through `requestCatLink` (the approval flow). Unlinking also
 * clears any cross-person link rows so the sighting drops off a shared timeline.
 */
export async function setEntryCat(entryId: string, ownerId: string, catId: string | null) {
  const entry = await db.catEntry.findUnique({ where: { id: entryId }, select: { ownerId: true } });
  if (!entry) throw new CatNotFoundError();
  if (entry.ownerId !== ownerId) throw new CatForbiddenError();

  if (catId !== null) {
    const cat = await db.cat.findUnique({ where: { id: catId }, select: { ownerId: true } });
    if (!cat) throw new CatNotFoundError();
    // Owned by someone else → not allowed here (needs their approval).
    if (cat.ownerId !== null && cat.ownerId !== ownerId) throw new CatForbiddenError();
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

// Turn a CLIP cosine distance into a friendly 0–100 "match" reading. Distances
// run ~0 (near-identical) upward; everything we surface is under the threshold,
// so this maps the shown range onto a confidence the UI can label.
function confidenceFromDistance(distance: number): number {
  return Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
}

export type CatSuggestion = {
  // "cat" = an existing profile to file under; "entry" = a bare sighting nobody
  // has profiled yet (linking it starts/uses a profile, see requestCatLink).
  kind: "cat" | "entry";
  catId: string | null; // set for kind "cat"
  entryId: string | null; // set for kind "entry" (the matched bare sighting)
  name: string | null;
  ownerId: string | null; // null for an ownerless cluster
  ownerDisplayName: string | null;
  ownerUsername: string | null;
  isOwn: boolean; // your own cat/sighting
  isShared: boolean; // an ownerless cluster (no owner to ask)
  immediate: boolean; // links without needing anyone's approval
  coverPhotoKey: string | null;
  coverThumbKey: string | null;
  distance: number;
  confidence: number; // 0–100, derived from distance
};

type SuggestRow = {
  catId: string | null;
  entryId: string | null;
  name: string | null;
  ownerId: string | null;
  ownerDisplayName: string | null;
  ownerUsername: string | null;
  coverPhotoKey: string | null;
  coverThumbKey: string | null;
  distance: number;
};

/**
 * "Might this be cat X?" — visual re-identification candidates for a sighting.
 * Looks up the nearest sightings by CLIP embedding (cosine distance) among
 * diaries the viewer can see, and returns two flavours of match:
 *   • already-profiled cats (your own and other people's), collapsed to the
 *     distinct cat — file your sighting under one of these;
 *   • bare sightings nobody has profiled yet ("unowned cats") — linking one
 *     starts a shared profile (your own immediately; someone else's by request).
 * Owner-only, and empty until the entry's embedding has been computed (it's
 * generated in the background after upload).
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

  // Nearest already-profiled cats (collapsed to the distinct cat).
  const catRows = await db.$queryRaw<SuggestRow[]>`
    SELECT s."catId", NULL::text AS "entryId", s.name, s."ownerId", s."ownerDisplayName",
           s."ownerUsername", s."coverPhotoKey", s."coverThumbKey", s.distance
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

  // Nearest bare sightings — cats nobody has profiled yet.
  const entryRows = await db.$queryRaw<SuggestRow[]>`
    SELECT NULL::text AS "catId", ce.id AS "entryId", ce.name, ce.owner_id AS "ownerId",
           u.display_name AS "ownerDisplayName", u.username AS "ownerUsername",
           cover.photo_key AS "coverPhotoKey", cover.thumb_key AS "coverThumbKey",
           (ce.embedding <=> ${embeddingStr}::vector) AS distance
    FROM cat_entries ce
    JOIN users u ON u.id = ce.owner_id
    LEFT JOIN LATERAL (
      SELECT p.photo_key, p.thumb_key
      FROM cat_entry_photos p
      WHERE p.cat_entry_id = ce.id
      ORDER BY p.position ASC
      LIMIT 1
    ) cover ON TRUE
    WHERE ce.cat_id IS NULL
      AND ce.id != ${entryId}
      AND ce.embedding IS NOT NULL
      AND ce.owner_id = ANY(${ownerIds}::text[])
      AND (ce.embedding <=> ${embeddingStr}::vector) < ${SUGGEST_DISTANCE_THRESHOLD}
    ORDER BY distance ASC
    LIMIT 4
  `;

  return [...catRows, ...entryRows]
    .map((r) => {
      const distance = Number(r.distance);
      const kind = r.catId ? ("cat" as const) : ("entry" as const);
      const isOwn = r.ownerId === entry.ownerId;
      const isShared = kind === "cat" && r.ownerId === null; // an ownerless cluster
      return {
        kind,
        catId: r.catId,
        entryId: r.entryId,
        name: r.name,
        ownerId: r.ownerId,
        ownerDisplayName: r.ownerDisplayName,
        ownerUsername: r.ownerUsername,
        isOwn,
        isShared,
        // No approval needed when it's yours or an ownerless cluster.
        immediate: isOwn || isShared,
        coverPhotoKey: r.coverPhotoKey,
        coverThumbKey: r.coverThumbKey,
        distance,
        confidence: confidenceFromDistance(distance),
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
}

export type CatLinkResult = { status: "APPROVED" | "PENDING" };

/** Ensures the requester's sighting belongs to a cluster it can grow, creating
    a fresh **ownerless** cat when it doesn't yet. Returns the cluster's cat id.
    Linking never makes the requester an owner — the cluster stays ownerless
    until someone claims it. */
async function ensureClusterForEntry(entryId: string, requesterId: string): Promise<string> {
  const entry = await db.catEntry.findUnique({ where: { id: entryId }, select: { catId: true } });
  if (entry?.catId) {
    const cat = await db.cat.findUnique({ where: { id: entry.catId }, select: { ownerId: true } });
    // Reuse the existing cluster if it's ownerless or already yours to grow.
    if (cat && (cat.ownerId === null || cat.ownerId === requesterId)) return entry.catId;
  }
  const created = await db.cat.create({ data: { ownerId: null, isOwned: false } });
  await db.catEntry.update({ where: { id: entryId }, data: { catId: created.id } });
  return created.id;
}

/**
 * Claims that `entryId` (the requester's own sighting) is the same animal as a
 * target — either an existing `catId` or another sighting `targetEntryId` that
 * nobody has profiled yet. Resolution:
 *   • an ownerless cluster, your own cat, or your own sighting → filed
 *     immediately (an ownerless cluster is started when linking bare sightings);
 *   • someone else's claimed cat → request, that owner approves;
 *   • someone else's bare sighting → an ownerless cluster is started from *your*
 *     sighting and they're asked to add theirs to it ("their sighting, their nod").
 * Linking never makes you an owner. You can only target things visible to you.
 */
export async function requestCatLink(input: {
  entryId: string;
  catId?: string;
  targetEntryId?: string;
  requesterId: string;
}): Promise<CatLinkResult> {
  const { entryId, requesterId } = input;

  const entry = await db.catEntry.findUnique({ where: { id: entryId }, select: { ownerId: true, name: true } });
  if (!entry) throw new CatNotFoundError();
  if (entry.ownerId !== requesterId) throw new CatForbiddenError();

  // Linking to a bare sighting that *does* have a cat is just linking to that cat.
  let catId = input.catId ?? null;
  let bareTarget: { id: string; ownerId: string; name: string | null } | null = null;
  if (!catId && input.targetEntryId) {
    const target = await db.catEntry.findUnique({
      where: { id: input.targetEntryId },
      select: { id: true, ownerId: true, name: true, catId: true },
    });
    if (!target) throw new CatNotFoundError();
    if (!(await canViewCatEntry(requesterId, target.ownerId))) throw new CatForbiddenError();
    if (target.catId) catId = target.catId;
    else bareTarget = { id: target.id, ownerId: target.ownerId, name: target.name };
  }

  // (a) File the requester's sighting under an existing cat.
  if (catId) {
    const cat = await db.cat.findUnique({ where: { id: catId }, select: { ownerId: true } });
    if (!cat) throw new CatNotFoundError();
    // Ownerless cluster or your own cat → file straight away (no owner to ask).
    if (cat.ownerId === null || cat.ownerId === requesterId) {
      await db.catEntry.update({ where: { id: entryId }, data: { catId } });
      return { status: "APPROVED" };
    }
    // Someone else's claimed pet → ask its owner.
    if (!(await canViewCatEntry(requesterId, cat.ownerId))) throw new CatForbiddenError();
    return createLinkRequest({ catId, catEntryId: entryId, requesterId, notifyUserId: cat.ownerId, withCatId: true });
  }

  // (b) Link to a bare sighting nobody has profiled — start an ownerless cluster.
  if (bareTarget) {
    const clusterId = await ensureClusterForEntry(entryId, requesterId);
    if (bareTarget.ownerId === requesterId) {
      await db.catEntry.update({ where: { id: bareTarget.id }, data: { catId: clusterId } });
      return { status: "APPROVED" };
    }
    // "Their sighting, their nod" — ask the other sighting's owner.
    return createLinkRequest({
      catId: clusterId,
      catEntryId: bareTarget.id,
      requesterId,
      notifyUserId: bareTarget.ownerId,
      withCatId: false, // route the recipient to their own sighting to approve
    });
  }

  throw new CatNotFoundError();
}

async function createLinkRequest(input: {
  catId: string;
  catEntryId: string;
  requesterId: string;
  notifyUserId: string;
  withCatId: boolean;
}): Promise<CatLinkResult> {
  const { catId, catEntryId, requesterId, notifyUserId, withCatId } = input;
  await db.catLink.upsert({
    where: { catId_catEntryId: { catId, catEntryId } },
    create: { catId, catEntryId, requesterId, status: "PENDING" },
    update: { status: "PENDING", requesterId },
  });
  await createNotification({
    userId: notifyUserId,
    actorId: requesterId,
    type: "CAT_LINK_REQUEST",
    catEntryId,
    ...(withCatId ? { catId } : {}),
  });
  return { status: "PENDING" };
}

/**
 * Approves or declines a "same cat?" claim. The approver is whichever party the
 * requester is *not*: when the requester proposed their sighting for your cat,
 * you (the cat owner) approve; when they proposed adding your sighting to their
 * cat, you (the sighting owner) approve. On approval the sighting joins the cat
 * and the requester is notified.
 */
export async function respondToCatLink(input: {
  linkId: string;
  approverId: string;
  approve: boolean;
}) {
  const { linkId, approverId, approve } = input;

  const link = await db.catLink.findUnique({
    where: { id: linkId },
    include: { cat: { select: { ownerId: true } }, catEntry: { select: { ownerId: true } } },
  });
  if (!link) throw new CatNotFoundError();

  // The approver owns the side the requester does not: pulling in someone
  // else's sighting → that sighting's owner approves; adding your sighting to
  // someone's claimed cat → that cat's owner approves.
  const expectedApprover =
    link.catEntry.ownerId !== link.requesterId ? link.catEntry.ownerId : link.cat.ownerId;
  if (!expectedApprover || approverId !== expectedApprover) throw new CatForbiddenError();
  if (link.status !== "PENDING") return link;

  if (approve) {
    await db.$transaction([
      db.catEntry.update({ where: { id: link.catEntryId }, data: { catId: link.catId } }),
      db.catLink.update({ where: { id: linkId }, data: { status: "APPROVED" } }),
    ]);
    await createNotification({
      userId: link.requesterId,
      actorId: approverId,
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

/**
 * Pending claims that someone's sighting is *your* cat, for you to review on the
 * cat page. Excludes your own outgoing claims (where you proposed adding another
 * person's sighting to this cat — those await *their* approval, see
 * `listPendingEntryLinks`).
 */
export async function listPendingCatLinks(catId: string, catOwnerId: string): Promise<PendingCatLink[]> {
  const cat = await db.cat.findUnique({ where: { id: catId }, select: { ownerId: true } });
  if (!cat || cat.ownerId !== catOwnerId) return [];

  return db.catLink.findMany({
    where: { catId, status: "PENDING", requesterId: { not: catOwnerId } },
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

export type PendingEntryLink = {
  id: string;
  createdAt: Date;
  requester: { id: string; username: string | null; displayName: string | null; avatarKey: string | null; image: string | null };
  // `name` is the cat's display name (owner-set or derived from a sighting), or
  // null when the cat is a still-nameless cluster.
  cat: { id: string; name: string | null; coverPhotoKey: string | null; coverThumbKey: string | null };
};

/**
 * Pending claims that *your* sighting is someone else's cat, for you to review
 * on that sighting's detail page — the other direction of `listPendingCatLinks`.
 */
export async function listPendingEntryLinks(entryId: string, entryOwnerId: string): Promise<PendingEntryLink[]> {
  const entry = await db.catEntry.findUnique({ where: { id: entryId }, select: { ownerId: true } });
  if (!entry || entry.ownerId !== entryOwnerId) return [];

  const links = await db.catLink.findMany({
    where: { catEntryId: entryId, status: "PENDING", requesterId: { not: entryOwnerId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      requester: { select: { id: true, username: true, displayName: true, avatarKey: true, image: true } },
      cat: {
        select: {
          id: true,
          name: true,
          entries: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              name: true,
              photos: { orderBy: { position: "asc" }, take: 1, select: { photoKey: true, thumbKey: true } },
            },
          },
        },
      },
    },
  });

  return links.map((l) => {
    const recent = l.cat.entries[0] ?? null;
    const cover = recent?.photos[0] ?? null;
    return {
      id: l.id,
      createdAt: l.createdAt,
      requester: l.requester,
      cat: {
        id: l.cat.id,
        name: l.cat.name ?? recent?.name ?? null,
        coverPhotoKey: cover?.photoKey ?? null,
        coverThumbKey: cover?.thumbKey ?? null,
      },
    };
  });
}
