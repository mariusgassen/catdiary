import Link from "next/link";
import { auth } from "@/lib/auth";
import { listCatEntriesForViewer } from "@/lib/catEntries";
import { getDownloadUrl } from "@/lib/storage";
import { CatEntryCard } from "@/components/CatEntryCard";

export default async function FeedPage() {
  const session = await auth();
  const { entries } = await listCatEntriesForViewer({ viewerId: session?.user?.id ?? null });

  const withPhotos = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      photoUrl: await getDownloadUrl(entry.thumbKey ?? entry.photoKey).catch(() => null),
    }))
  );

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
        <CatEntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
