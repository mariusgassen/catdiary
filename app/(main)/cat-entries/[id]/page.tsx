import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PawPrint } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getCatEntryForViewer } from "@/lib/catEntries";
import { listPendingEntryLinks } from "@/lib/cats";
import { photoUrlsFor } from "@/lib/photo-urls";
import { listComments } from "@/lib/comments";
import { CatEntryCard } from "@/components/CatEntryCard";
import { BackLink } from "@/components/BackLink";
import { CommentsSection } from "@/components/CommentsSection";
import { RecordView } from "@/components/RecordView";
import { ReactionSummary } from "@/components/ReactionStamp";
import { SimilarCats } from "@/components/SimilarCats";
import { CatMatcher } from "@/components/CatMatcher";
import { EntryLinkRequests } from "@/components/EntryLinkRequests";
import { EntryMap } from "@/components/EntryMap";
import { displayNameFor } from "@/lib/userDisplay";
import { possessiveDiaryEn, possessiveDiaryDe } from "@/lib/possessiveDiary";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocale();
  const session = await auth();
  const entry = await getCatEntryForViewer(id, session?.user?.id ?? null);
  if (!entry) return { title: "Cat Diary" };

  const ownerName = displayNameFor(entry.owner);
  const possessiveDiary =
    locale === "de"
      ? possessiveDiaryDe(ownerName)
      : possessiveDiaryEn(ownerName);
  const title = entry.name ? `${entry.name} — Cat Diary` : `A cat in ${possessiveDiary}`;
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

  const isOwner = viewerId === entry.ownerId;
  const [comments, t, pendingEntryLinks] = await Promise.all([
    listComments(entry.id, viewerId),
    getTranslations("cats"),
    isOwner ? listPendingEntryLinks(entry.id, entry.ownerId) : Promise.resolve([]),
  ]);

  return (
    <div className="paper-grid min-h-dvh flex flex-col gap-4 py-4">
      {viewerId && viewerId !== entry.ownerId && <RecordView entryId={entry.id} />}
      <BackLink />
      <CatEntryCard
        entry={{ ...entry, photoUrls: photoUrlsFor(entry.photos, { full: true }) }}
        viewerId={viewerId}
        linkToDetail={false}
      />
      {entry.cat && (
        <Link
          href={`/cats/${entry.cat.id}`}
          className="mx-3 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm shadow-sm transition-colors hover:text-accent"
        >
          <PawPrint size={15} className="text-accent" aria-hidden />
          <span>
            {entry.cat.name ?? entry.name
              ? t("entryLink", { name: (entry.cat.name ?? entry.name)! })
              : t("entryLinkGeneric")}
          </span>
        </Link>
      )}
      {isOwner && pendingEntryLinks.length > 0 && <EntryLinkRequests requests={pendingEntryLinks} />}
      {entry.reactionBreakdown && <ReactionSummary breakdown={entry.reactionBreakdown} />}
      {entry.latitude != null && entry.longitude != null && (
        <EntryMap lat={entry.latitude} lng={entry.longitude} locationName={entry.locationName} />
      )}
      <CommentsSection
        entryId={entry.id}
        entryOwnerId={entry.ownerId}
        viewerId={viewerId}
        initialComments={comments}
      />
      {viewerId && <CatMatcher entryId={entry.id} isOwner={isOwner} />}
      <SimilarCats entryId={entry.id} />
    </div>
  );
}
