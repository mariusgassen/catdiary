import { db } from "@/lib/db";
import { canViewCatEntry } from "@/lib/catEntries";

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
 * Every linked entry shares the cat's owner (see `setEntryCat`), so once the
 * cat itself is visible all of its entries are too.
 */
export async function listEntriesForCat(catId: string, viewerId: string | null) {
  const cat = await db.cat.findUnique({ where: { id: catId }, select: { ownerId: true } });
  if (!cat) return [];
  if (!(await canViewCatEntry(viewerId, cat.ownerId))) return [];

  return db.catEntry.findMany({
    where: { catId },
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
 * of the owner's cats. Both the entry and the cat must belong to `ownerId` —
 * you can only file your own sightings, and only under your own cats.
 */
export async function setEntryCat(entryId: string, ownerId: string, catId: string | null) {
  const entry = await db.catEntry.findUnique({ where: { id: entryId }, select: { ownerId: true } });
  if (!entry) throw new CatNotFoundError();
  if (entry.ownerId !== ownerId) throw new CatForbiddenError();

  if (catId !== null) {
    const cat = await db.cat.findUnique({ where: { id: catId }, select: { ownerId: true } });
    if (!cat) throw new CatNotFoundError();
    if (cat.ownerId !== ownerId) throw new CatForbiddenError();
  }

  return db.catEntry.update({ where: { id: entryId }, data: { catId } });
}
