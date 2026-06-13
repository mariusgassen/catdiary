import { db } from "@/lib/db";
import { canViewCatEntry } from "@/lib/catEntries";

/**
 * "Year in Cats" — a calendar review of a diary. A naturalist's notebook wants
 * to be looked back on, so this assembles one owner's entries for a single year
 * into a month-by-day grid plus a few headline figures (cats logged, distinct
 * named cats, breeds, places, the busiest month). Purely a read-back of history
 * the viewer is already allowed to see — visibility is enforced up front, so a
 * private diary only opens to its owner and approved trackers.
 *
 * Days are bucketed by UTC calendar date to match the rest of the date logic
 * (`listOnThisDayEntries` uses the same UTC `EXTRACT`); the client builds its
 * calendar grid from the same UTC year/month/day so cells line up exactly.
 */

export type YearDayEntry = {
  id: string;
  name: string | null;
  breed: string | null;
  thumbKey: string | null;
};

export type YearDay = {
  month: number; // 1-12
  day: number; // 1-31
  entries: YearDayEntry[];
};

export type YearInCats = {
  ownerId: string;
  year: number;
  availableYears: number[]; // years (desc) the owner has any entry in
  totalEntries: number;
  namedCats: number; // distinct non-empty names (case-insensitive)
  breeds: number; // distinct non-empty breeds
  places: number; // distinct non-empty place names
  busiestMonth: number | null; // 1-12 with the most entries, null if the year is empty
  busiestMonthCount: number;
  days: YearDay[]; // only days that actually have entries
};

export async function getYearInCats(
  viewerId: string | null,
  ownerId: string,
  year?: number,
): Promise<YearInCats | null> {
  if (!(await canViewCatEntry(viewerId, ownerId))) return null;

  // Distinct years this diary has entries in, newest first, so the page can
  // offer a year switcher and default to the most recent populated year.
  const yearRows = await db.$queryRaw<{ year: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM created_at)::int AS year
    FROM cat_entries
    WHERE owner_id = ${ownerId}
    ORDER BY year DESC
  `;
  const availableYears = yearRows.map((r) => Number(r.year));

  const resolvedYear = year ?? availableYears[0] ?? new Date().getUTCFullYear();

  const start = new Date(Date.UTC(resolvedYear, 0, 1));
  const end = new Date(Date.UTC(resolvedYear + 1, 0, 1));

  const entries = await db.catEntry.findMany({
    where: { ownerId, createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      breed: true,
      locationName: true,
      createdAt: true,
      photos: { orderBy: { position: "asc" }, take: 1, select: { thumbKey: true, photoKey: true } },
    },
  });

  const dayMap = new Map<string, YearDay>();
  const monthCounts = new Array<number>(12).fill(0);
  const names = new Set<string>();
  const breeds = new Set<string>();
  const places = new Set<string>();

  for (const e of entries) {
    const month = e.createdAt.getUTCMonth() + 1;
    const day = e.createdAt.getUTCDate();
    monthCounts[month - 1] += 1;

    if (e.name?.trim()) names.add(e.name.trim().toLowerCase());
    if (e.breed?.trim()) breeds.add(e.breed.trim().toLowerCase());
    if (e.locationName?.trim()) places.add(e.locationName.trim().toLowerCase());

    const key = `${month}-${day}`;
    let bucket = dayMap.get(key);
    if (!bucket) {
      bucket = { month, day, entries: [] };
      dayMap.set(key, bucket);
    }
    bucket.entries.push({
      id: e.id,
      name: e.name,
      breed: e.breed,
      thumbKey: e.photos[0]?.thumbKey ?? e.photos[0]?.photoKey ?? null,
    });
  }

  let busiestMonth: number | null = null;
  let busiestMonthCount = 0;
  monthCounts.forEach((count, i) => {
    if (count > busiestMonthCount) {
      busiestMonthCount = count;
      busiestMonth = i + 1;
    }
  });

  return {
    ownerId,
    year: resolvedYear,
    availableYears,
    totalEntries: entries.length,
    namedCats: names.size,
    breeds: breeds.size,
    places: places.size,
    busiestMonth,
    busiestMonthCount,
    days: [...dayMap.values()],
  };
}
