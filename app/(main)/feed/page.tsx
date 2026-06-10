import Link from "next/link";
import { Camera } from "lucide-react";
import { auth } from "@/lib/auth";
import { listCatEntriesForViewer } from "@/lib/catEntries";
import { CatEntryCard } from "@/components/CatEntryCard";

export default async function FeedPage() {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const { entries } = await listCatEntriesForViewer({ viewerId });

  const withPhotos = entries.map((entry) => ({
    ...entry,
    photoUrl: `/api/photos/${entry.thumbKey ?? entry.photoKey}`,
  }));

  if (withPhotos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-24 text-center">
        <span className="text-5xl">🐱</span>
        <div className="space-y-1">
          <p className="font-semibold">No cats here yet</p>
          <p className="text-sm text-muted">Be the first to log one</p>
        </div>
        <Link
          href="/capture"
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/30 transition-transform active:scale-95"
        >
          <Camera size={16} />
          Log a cat
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border">
        <span className="text-lg font-bold tracking-tight">🐾 Cat Diary</span>
      </header>

      {/* Feed */}
      <div>
        {withPhotos.map((entry) => (
          <CatEntryCard key={entry.id} entry={entry} viewerId={viewerId} />
        ))}
      </div>
    </div>
  );
}
