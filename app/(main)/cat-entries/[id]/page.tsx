import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCatEntryForViewer } from "@/lib/catEntries";
import { photoUrlsFor } from "@/lib/photo-urls";
import { listComments } from "@/lib/comments";
import { CatEntryCard } from "@/components/CatEntryCard";
import { BackLink } from "@/components/BackLink";
import { CommentsSection } from "@/components/CommentsSection";
import { SimilarCats } from "@/components/SimilarCats";
import { displayNameFor } from "@/lib/userDisplay";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  const entry = await getCatEntryForViewer(id, session?.user?.id ?? null);
  if (!entry) return { title: "Cat Diary" };

  const ownerName = displayNameFor(entry.owner);
  const title = entry.name ? `${entry.name} — Cat Diary` : `A cat in ${ownerName}'s diary`;
  const description = entry.notes ?? `A cat ${ownerName} met${entry.locationName ? ` in ${entry.locationName}` : ""}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: photoUrlsFor(entry.photos, { full: true }),
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
      <BackLink label="Back to the journal" />
      <CatEntryCard
        entry={{ ...entry, photoUrls: photoUrlsFor(entry.photos, { full: true }) }}
        viewerId={viewerId}
        linkToDetail={false}
      />
      <CommentsSection
        entryId={entry.id}
        entryOwnerId={entry.ownerId}
        viewerId={viewerId}
        initialComments={comments}
      />
      <SimilarCats entryId={entry.id} />
    </div>
  );
}
