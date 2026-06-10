import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCatEntryForViewer } from "@/lib/catEntries";
import { listComments } from "@/lib/comments";
import { CatEntryCard } from "@/components/CatEntryCard";
import { CommentsSection } from "@/components/CommentsSection";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  const entry = await getCatEntryForViewer(id, session?.user?.id ?? null);
  if (!entry) return { title: "Cat Diary" };

  const title = entry.name ? `${entry.name} — Cat Diary` : `A cat in ${entry.owner.displayName}'s diary`;
  const description = entry.notes ?? `A cat ${entry.owner.displayName} met${entry.locationName ? ` in ${entry.locationName}` : ""}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [`/api/photos/${entry.photoKey}`],
    },
  };
}

export default async function CatEntryPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const entry = await getCatEntryForViewer(id, viewerId);
  if (!entry) {
    notFound();
  }

  const comments = await listComments(entry.id, viewerId);

  return (
    <div className="paper-grid min-h-dvh flex flex-col gap-4 py-4">
      <CatEntryCard
        entry={{ ...entry, photoUrl: `/api/photos/${entry.photoKey}` }}
        viewerId={viewerId}
      />
      <CommentsSection
        entryId={entry.id}
        entryOwnerId={entry.ownerId}
        viewerId={viewerId}
        initialComments={comments}
      />
    </div>
  );
}
