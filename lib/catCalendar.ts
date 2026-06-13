import { db } from "@/lib/db";
import { canViewCatEntry } from "@/lib/catEntries";

/**
 * "Create a photo calendar" — turn a diary into a printable wall calendar for a
 * year (defaults to next year). For each of the twelve months we suggest one
 * cat from the owner's sightings, preferring a cat photographed in that same
 * calendar month in the past (a cat met last December headlines next December),
 * then the best-loved / most recent shots to fill the rest. Purely a read-back
 * of history the viewer can already see — visibility is enforced up front.
 *
 * The suggestion is just a starting point: the whole candidate `pool` is
 * returned so the client can let the user swap any month's photo.
 */

export type CalendarCandidate = {
  entryId: string;
  photoKey: string;
  thumbKey: string | null;
  name: string | null;
  breed: string | null;
};

export type CatCalendarMonth = {
  month: number; // 1-12
  suggestion: CalendarCandidate | null;
};

export type CatCalendar = {
  ownerId: string;
  year: number;
  months: CatCalendarMonth[]; // always length 12, Jan..Dec
  pool: CalendarCandidate[]; // every photo-bearing entry, best first
};

export async function getCatCalendar(
  viewerId: string | null,
  ownerId: string,
  year?: number,
): Promise<CatCalendar | null> {
  if (!(await canViewCatEntry(viewerId, ownerId))) return null;

  const resolvedYear = year ?? new Date().getUTCFullYear() + 1;

  // Every entry that has at least one photo, best-loved first, then most recent.
  const entries = await db.catEntry.findMany({
    where: { ownerId, photos: { some: {} } },
    orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      breed: true,
      createdAt: true,
      photos: { orderBy: { position: "asc" }, take: 1, select: { photoKey: true, thumbKey: true } },
    },
  });

  const candidates = entries
    .filter((e) => e.photos[0])
    .map((e) => ({
      candidate: {
        entryId: e.id,
        photoKey: e.photos[0]!.photoKey,
        thumbKey: e.photos[0]!.thumbKey,
        name: e.name,
        breed: e.breed,
      } satisfies CalendarCandidate,
      sourceMonth: e.createdAt.getUTCMonth() + 1, // 1-12
    }));

  const pool: CalendarCandidate[] = candidates.map((c) => c.candidate);

  const months: CatCalendarMonth[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    suggestion: null,
  }));

  if (candidates.length > 0) {
    const used = new Set<string>();

    // Pass 1: seasonal match — a cat photographed in the same calendar month.
    for (const m of months) {
      const match = candidates.find(
        (c) => c.sourceMonth === m.month && !used.has(c.candidate.entryId),
      );
      if (match) {
        m.suggestion = match.candidate;
        used.add(match.candidate.entryId);
      }
    }

    // Pass 2: fill the rest with the best remaining (distinct) candidates.
    let next = 0;
    for (const m of months) {
      if (m.suggestion) continue;
      while (next < pool.length && used.has(pool[next].entryId)) next++;
      if (next < pool.length) {
        m.suggestion = pool[next];
        used.add(pool[next].entryId);
        next++;
      }
    }

    // Pass 3: if there are fewer entries than months, cycle through the pool so
    // every month still gets a photo.
    for (let i = 0; i < months.length; i++) {
      if (!months[i].suggestion) months[i].suggestion = pool[i % pool.length];
    }
  }

  return { ownerId, year: resolvedYear, months, pool };
}
