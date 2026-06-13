import { db } from "@/lib/db";
import { canViewCatEntry } from "@/lib/catEntries";

/**
 * A passive engagement delta for one entry, accumulated client-side and sent in
 * batches. Unlike a "seen" open (recorded by `recordView`), these are the
 * lower-signal, higher-volume metrics: how often a card scrolled into the feed,
 * how long it stayed on screen, and how far the detail page was read.
 */
export type EngagementEvent = {
  entryId: string;
  impressions?: number; // feed cards that scrolled into view
  dwellMs?: number; // time the entry was on screen
  readPct?: number; // furthest detail-page scroll depth, 0–100
};

export const MAX_ENGAGEMENT_EVENTS = 100;
const MAX_IMPRESSIONS_PER_EVENT = 1000;
const MAX_DWELL_MS_PER_EVENT = 60 * 60 * 1000; // 1h — guards against runaway/background timers

function clampInt(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Folds a batch of passive engagement deltas into each viewer/entry's
 * `EntryView` row. Mirrors `recordView`'s rules — visibility-checked, and the
 * owner's own activity on their own entries is never recorded — but only ever
 * touches the passive columns, never the `count` of deliberate opens.
 *
 * Returns the number of events actually applied. Silently drops events for
 * entries that don't exist, aren't visible to the viewer, or are the viewer's
 * own — a misbehaving or stale client must never error the request.
 */
export async function recordEngagement(viewerId: string, events: EngagementEvent[]): Promise<number> {
  if (events.length === 0) return 0;

  // Collapse duplicate entryIds in the batch and clamp every value.
  const byEntry = new Map<string, { impressions: number; dwellMs: number; readPct: number }>();
  for (const ev of events.slice(0, MAX_ENGAGEMENT_EVENTS)) {
    if (typeof ev.entryId !== "string" || ev.entryId.length === 0) continue;
    const acc = byEntry.get(ev.entryId) ?? { impressions: 0, dwellMs: 0, readPct: 0 };
    acc.impressions += clampInt(ev.impressions, 0, MAX_IMPRESSIONS_PER_EVENT);
    acc.dwellMs += clampInt(ev.dwellMs, 0, MAX_DWELL_MS_PER_EVENT);
    acc.readPct = Math.max(acc.readPct, clampInt(ev.readPct, 0, 100));
    byEntry.set(ev.entryId, acc);
  }
  if (byEntry.size === 0) return 0;

  const entries = await db.catEntry.findMany({
    where: { id: { in: [...byEntry.keys()] } },
    select: { id: true, ownerId: true },
  });

  // Resolve each distinct owner's visibility once.
  const visibleByOwner = new Map<string, boolean>();
  for (const ownerId of new Set(entries.map((e) => e.ownerId))) {
    if (ownerId === viewerId) {
      visibleByOwner.set(ownerId, false); // never record activity on your own entries
    } else {
      visibleByOwner.set(ownerId, await canViewCatEntry(viewerId, ownerId));
    }
  }

  const writes = entries.flatMap((entry) => {
    if (!visibleByOwner.get(entry.ownerId)) return [];
    const d = byEntry.get(entry.id)!;
    if (d.impressions === 0 && d.dwellMs === 0 && d.readPct === 0) return [];
    return [
      db.$executeRaw`
        INSERT INTO entry_views (user_id, cat_entry_id, count, feed_impressions, dwell_ms, max_read_pct, first_seen_at, last_seen_at)
        VALUES (${viewerId}, ${entry.id}, 0, ${d.impressions}, ${d.dwellMs}, ${d.readPct}, now(), now())
        ON CONFLICT (user_id, cat_entry_id) DO UPDATE SET
          feed_impressions = entry_views.feed_impressions + ${d.impressions},
          dwell_ms = entry_views.dwell_ms + ${d.dwellMs},
          max_read_pct = GREATEST(entry_views.max_read_pct, ${d.readPct}),
          last_seen_at = now()
      `,
    ];
  });

  if (writes.length === 0) return 0;
  await db.$transaction(writes);
  return writes.length;
}
