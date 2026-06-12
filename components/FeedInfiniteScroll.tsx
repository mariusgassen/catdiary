"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { CatEntryCard } from "@/components/CatEntryCard";
import { photoUrlsFor } from "@/lib/photo-urls";

export type FeedEntry = {
  id: string;
  name: string | null;
  breed: string | null;
  notes: string | null;
  locationName?: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string | Date;
  photoUrls: string[];
  photos?: { photoKey: string; thumbKey: string | null }[];
  owner: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarKey: string | null;
    image: string | null;
  };
  _count: { likes: number; comments: number };
  likes?: { userId: string }[];
};

function useDayLabel() {
  const t = useTranslations("feed");
  const locale = useLocale();

  return function dayLabel(date: Date, now: Date): string {
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
    if (dayDiff === 0) return t("today");
    if (dayDiff === 1) return t("yesterday");
    const opts: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
    };
    return new Intl.DateTimeFormat(locale, opts).format(date);
  };
}

function groupByDay(
  entries: FeedEntry[],
  dayLabel: (date: Date, now: Date) => string,
): { label: string; entries: FeedEntry[] }[] {
  const now = new Date();
  const groups: { label: string; entries: FeedEntry[] }[] = [];
  for (const entry of entries) {
    const label = dayLabel(new Date(entry.createdAt), now);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }
  return groups;
}

export function FeedInfiniteScroll({
  initialEntries,
  initialNextCursor,
  viewerId,
}: {
  initialEntries: FeedEntry[];
  initialNextCursor: string | null;
  viewerId: string | null;
}) {
  const [extraEntries, setExtraEntries] = useState<FeedEntry[]>([]);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const getDayLabel = useDayLabel();

  // Reset extra pages when initial data refreshes (pull-to-refresh)
  const initialFirstIdRef = useRef(initialEntries[0]?.id);
  if (initialFirstIdRef.current !== initialEntries[0]?.id) {
    initialFirstIdRef.current = initialEntries[0]?.id;
    setExtraEntries([]);
    setNextCursor(initialNextCursor);
  }

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cat-entries?cursor=${encodeURIComponent(nextCursor)}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        entries: (Omit<FeedEntry, "photoUrls"> & { photos: { photoKey: string; thumbKey: string | null }[] })[];
        nextCursor: string | null;
      };
      const newEntries: FeedEntry[] = data.entries.map((e) => ({
        ...e,
        photoUrls: photoUrlsFor(e.photos),
      }));
      setExtraEntries((prev) => [...prev, ...newEntries]);
      setNextCursor(data.nextCursor);
    } catch {
      // network error — leave cursor so user can retry on next scroll
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  const allEntries = [...initialEntries, ...extraEntries];
  const groups = groupByDay(allEntries, getDayLabel);

  return (
    <>
      <div className="space-y-5 py-4">
        {groups.map((group) => (
          <section key={group.label} className="space-y-4">
            <div className="flex items-center gap-3 px-4">
              <span className="h-px flex-1 bg-border" aria-hidden />
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</h2>
              <span className="h-px flex-1 bg-border" aria-hidden />
            </div>
            {group.entries.map((entry) => (
              <CatEntryCard key={entry.id} entry={entry} viewerId={viewerId} />
            ))}
          </section>
        ))}
      </div>

      {/* Sentinel — intersection observer loads next page when visible */}
      <div ref={sentinelRef} className="flex justify-center py-6" aria-hidden>
        {loading && <Loader2 size={20} className="animate-spin text-muted" />}
      </div>
    </>
  );
}
