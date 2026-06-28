import { db } from "@/lib/db";
import { canViewCatEntry } from "@/lib/catEntries";
import { CatNotFoundError, CatForbiddenError } from "@/lib/cats";

// Business logic for a cat's care record: structured pet metadata (microchip,
// spay/neuter, birthday, vet notes, allergies) plus a vaccination history and
// weight log. Lives on the `Cat` entity, not on every sighting — it only makes
// sense once a cat has an owner to maintain it. Private by default
// (`carePublic = false`): a sighting's existence is public by design, but
// medical/identifying details about someone's pet are not, unless the owner
// opts in.

type CareGateCat = { ownerId: string | null; carePublic: boolean };

async function canViewCare(cat: CareGateCat, viewerId: string | null): Promise<boolean> {
  if (cat.ownerId && cat.ownerId === viewerId) return true; // owner always sees their own record
  if (!cat.carePublic || !cat.ownerId) return false;
  return canViewCatEntry(viewerId, cat.ownerId);
}

const careSelect = {
  ownerId: true,
  microchipId: true,
  neutered: true,
  birthday: true,
  vetNotes: true,
  allergies: true,
  carePublic: true,
} as const;

async function getCareGatedCat(catId: string, viewerId: string | null) {
  const cat = await db.cat.findUnique({ where: { id: catId }, select: careSelect });
  if (!cat) return null;
  if (!(await canViewCare(cat, viewerId))) return null;
  return cat;
}

/** Loads the cat and confirms `ownerId` owns it, for any care-record write. */
async function requireOwnedCat(catId: string, ownerId: string) {
  const cat = await db.cat.findUnique({ where: { id: catId }, select: { ownerId: true } });
  if (!cat) throw new CatNotFoundError();
  if (cat.ownerId !== ownerId) throw new CatForbiddenError();
}

export type CatVaccinationEntry = {
  id: string;
  name: string;
  givenAt: Date;
  dueAt: Date | null;
  notes: string | null;
};

export type CatWeightLogEntry = {
  id: string;
  weightKg: number;
  measuredAt: Date;
  notes: string | null;
};

export type CatCareRecord = {
  microchipId: string | null;
  neutered: boolean | null;
  birthday: Date | null;
  vetNotes: string | null;
  allergies: string | null;
  carePublic: boolean;
  isOwner: boolean;
  vaccinations: CatVaccinationEntry[];
  weightEntries: CatWeightLogEntry[];
};

/**
 * A cat's care record — visible to its owner always, and to any other viewer
 * only when `carePublic` is true and they could already see the cat. Returns
 * null rather than an empty record so the UI can tell "nothing to show" apart
 * from "an empty record."
 */
export async function getCatCareRecord(catId: string, viewerId: string | null): Promise<CatCareRecord | null> {
  const cat = await getCareGatedCat(catId, viewerId);
  if (!cat) return null;

  const [vaccinations, weightEntries] = await Promise.all([
    db.catVaccination.findMany({ where: { catId }, orderBy: { givenAt: "desc" } }),
    db.catWeightEntry.findMany({ where: { catId }, orderBy: { measuredAt: "desc" } }),
  ]);

  return {
    microchipId: cat.microchipId,
    neutered: cat.neutered,
    birthday: cat.birthday,
    vetNotes: cat.vetNotes,
    allergies: cat.allergies,
    carePublic: cat.carePublic,
    isOwner: cat.ownerId === viewerId,
    vaccinations,
    weightEntries,
  };
}

export async function listVaccinations(catId: string, viewerId: string | null): Promise<CatVaccinationEntry[]> {
  const cat = await getCareGatedCat(catId, viewerId);
  if (!cat) return [];
  return db.catVaccination.findMany({ where: { catId }, orderBy: { givenAt: "desc" } });
}

export async function listWeightEntries(catId: string, viewerId: string | null): Promise<CatWeightLogEntry[]> {
  const cat = await getCareGatedCat(catId, viewerId);
  if (!cat) return [];
  return db.catWeightEntry.findMany({ where: { catId }, orderBy: { measuredAt: "desc" } });
}

export type UpdateCatCareInput = Partial<{
  microchipId: string | null;
  neutered: boolean | null;
  birthday: Date | null;
  vetNotes: string | null;
  allergies: string | null;
  carePublic: boolean;
}>;

/** Updates a cat's scalar care fields and/or `carePublic`. Owner-only. */
export async function updateCatCare(catId: string, ownerId: string, input: UpdateCatCareInput) {
  await requireOwnedCat(catId, ownerId);
  return db.cat.update({ where: { id: catId }, data: input });
}

export type AddVaccinationInput = {
  name: string;
  givenAt: Date;
  dueAt?: Date | null;
  notes?: string | null;
};

/** Adds a vaccination record to a cat's care timeline. Owner-only. */
export async function addVaccination(catId: string, ownerId: string, input: AddVaccinationInput) {
  await requireOwnedCat(catId, ownerId);
  return db.catVaccination.create({
    data: {
      catId,
      name: input.name,
      givenAt: input.givenAt,
      dueAt: input.dueAt ?? null,
      notes: input.notes ?? null,
    },
  });
}

/** Deletes a vaccination record. Owner-only (checked via the parent cat). */
export async function deleteVaccination(vaccinationId: string, ownerId: string) {
  const vaccination = await db.catVaccination.findUnique({
    where: { id: vaccinationId },
    select: { cat: { select: { ownerId: true } } },
  });
  if (!vaccination) throw new CatNotFoundError();
  if (vaccination.cat.ownerId !== ownerId) throw new CatForbiddenError();
  await db.catVaccination.delete({ where: { id: vaccinationId } });
}

export type AddWeightEntryInput = {
  weightKg: number;
  measuredAt: Date;
  notes?: string | null;
};

/** Adds a weigh-in to a cat's weight log. Owner-only. */
export async function addWeightEntry(catId: string, ownerId: string, input: AddWeightEntryInput) {
  await requireOwnedCat(catId, ownerId);
  return db.catWeightEntry.create({
    data: {
      catId,
      weightKg: input.weightKg,
      measuredAt: input.measuredAt,
      notes: input.notes ?? null,
    },
  });
}

/** Deletes a weight log entry. Owner-only (checked via the parent cat). */
export async function deleteWeightEntry(weightEntryId: string, ownerId: string) {
  const entry = await db.catWeightEntry.findUnique({
    where: { id: weightEntryId },
    select: { cat: { select: { ownerId: true } } },
  });
  if (!entry) throw new CatNotFoundError();
  if (entry.cat.ownerId !== ownerId) throw new CatForbiddenError();
  await db.catWeightEntry.delete({ where: { id: weightEntryId } });
}
