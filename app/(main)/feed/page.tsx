import Link from "next/link";
import { PawPrint } from "lucide-react";
import { auth } from "@/lib/auth";
import { listCatEntriesForViewer } from "@/lib/catEntries";
import { photoUrlsFor } from "@/lib/photo-urls";
import { CatEntryCard } from "@/components/CatEntryCard";
import { NotificationBell } from "@/components/NotificationBell";

type FeedEntry = Awaited<ReturnType<typeof listCatEntriesForViewer>>["entries"][number] & {
  photoUrls: string[];
};

function dayLabel(date: Date, now: Date): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return date.toLocaleDateString("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

function groupByDay(entries: FeedEntry[]): { label: string; entries: FeedEntry[] }[] {
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

export default async function FeedPage() {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const { entries } = await listCatEntriesForViewer({ viewerId });

  const withPhotos: FeedEntry[] = entries.map((entry) => ({
    ...entry,
    photoUrls: photoUrlsFor(entry.photos),
  }));

  if (withPhotos.length === 0) {
    return (
      <div className="paper-grid flex min-h-dvh flex-col items-center gap-4 px-6 py-24 text-center">
        <span className="text-5xl">🐱</span>
        <div className="space-y-1">
          <p className="text-lg font-semibold">This page is still blank</p>
          <p className="text-sm text-muted">Met a cat today? Write it down.</p>
        </div>
        <Link
          href="/capture"
          className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/30 transition-transform active:scale-95"
        >
          <PawPrint size={16} />
          Log a cat
        </Link>
      </div>
    );
  }

  const groups = groupByDay(withPhotos);

  return (
    <div className="paper-grid min-h-dvh">
      {/* Masthead */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-1.5 text-xl font-bold tracking-tight">
            <PawPrint size={18} className="text-accent" aria-hidden />
            Cat Diary
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted">
              {new Date().toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <NotificationBell />
          </div>
        </div>
      </header>

      {/* Journal timeline */}
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
    </div>
  );
}
