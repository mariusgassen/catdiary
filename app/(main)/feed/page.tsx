import Link from "next/link";
import { PawPrint } from "lucide-react";
import { auth } from "@/lib/auth";
import { listCatEntriesForViewer, listOnThisDayEntries } from "@/lib/catEntries";
import { photoUrlsFor } from "@/lib/photo-urls";
import { NotificationBell } from "@/components/NotificationBell";
import { OnThisDayStrip } from "@/components/OnThisDayStrip";
import { FeedInfiniteScroll } from "@/components/FeedInfiniteScroll";
import type { FeedEntry } from "@/components/FeedInfiniteScroll";

export default async function FeedPage() {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const [{ entries, nextCursor }, onThisDay] = await Promise.all([
    listCatEntriesForViewer({ viewerId }),
    listOnThisDayEntries(viewerId),
  ]);

  const withPhotos: FeedEntry[] = entries.map((entry) => ({
    ...entry,
    photoUrls: photoUrlsFor(entry.photos),
  }));

  const onThisDayEntries = onThisDay.map((e) => ({
    id: e.id,
    name: e.name,
    createdAt: e.createdAt,
    photos: e.photos.map((p) => ({ photoKey: p.photoKey, thumbKey: p.thumbKey })),
  }));

  if (withPhotos.length === 0 && onThisDayEntries.length === 0) {
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

      {onThisDayEntries.length > 0 && <OnThisDayStrip entries={onThisDayEntries} />}

      <FeedInfiniteScroll
        initialEntries={withPhotos}
        initialNextCursor={nextCursor}
        viewerId={viewerId}
      />
    </div>
  );
}
