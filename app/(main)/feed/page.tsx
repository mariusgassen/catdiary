import Link from "next/link";
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
      <div className="flex flex-col items-center gap-3 py-16 text-center text-black/60 dark:text-white/60">
        <p>No cats here yet.</p>
        <Link href="/cat-entries/new" className="font-medium underline">
          Log the first one
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {withPhotos.map((entry) => (
        <CatEntryCard key={entry.id} entry={entry} viewerId={viewerId} />
      ))}
    </div>
  );
}
