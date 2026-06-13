import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SquarePen, PawPrint, Home } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getCatForViewer, listEntriesForCat } from "@/lib/cats";
import { photoUrlsFor } from "@/lib/photo-urls";
import { CatEntryGridCard } from "@/components/CatEntryGridCard";
import { BackLink } from "@/components/BackLink";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  const cat = await getCatForViewer(id, session?.user?.id ?? null);
  if (!cat) return { title: "Cat Diary" };

  const title = `${cat.name} — Cat Diary`;
  const description = cat.description ?? `${cat.name}${cat.breed ? `, ${cat.breed}` : ""}.`;
  const cover = cat.coverPhotoKey ? `/api/photos/${cat.coverPhotoKey}` : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(cover ? { images: [{ url: cover }] } : {}),
    },
  };
}

export default async function CatPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const t = await getTranslations("cats");

  const cat = await getCatForViewer(id, viewerId);
  if (!cat) {
    notFound();
  }

  const entries = await listEntriesForCat(id, viewerId);
  const withPhotos = entries.map((entry) => ({ ...entry, photoUrls: photoUrlsFor(entry.photos) }));
  const isOwner = viewerId === cat.ownerId;
  const coverUrl = cat.coverThumbKey
    ? `/api/photos/${cat.coverThumbKey}`
    : cat.coverPhotoKey
      ? `/api/photos/${cat.coverPhotoKey}`
      : null;

  return (
    <div className="paper-grid min-h-dvh flex flex-col gap-5 py-4">
      <BackLink />

      {/* Cat profile cover */}
      <header className="mx-3 rounded-xl border border-border bg-surface px-5 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-1 min-w-0 items-center gap-3">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt={cat.name} className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 select-none items-center justify-center rounded-full bg-accent-soft text-2xl ring-2 ring-border">
                🐱
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-bold tracking-tight">{cat.name}</h1>
                {cat.isOwned && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                    <Home size={11} aria-hidden />
                    {t("owned")}
                  </span>
                )}
              </div>
              <p className="pt-0.5 text-sm text-muted">
                {[cat.breed, cat.color].filter(Boolean).join(" · ") || (cat.isOwned ? "" : t("met"))}
              </p>
              <p className="flex items-center gap-1 pt-1 text-sm text-muted">
                <PawPrint size={13} aria-hidden />
                {t("sightings", { count: cat.entryCount })}
              </p>
            </div>
          </div>
          {isOwner && (
            <Link
              href={`/cats/${cat.id}/edit`}
              className="rounded-xl border border-border p-2 text-muted transition-colors hover:text-foreground"
              aria-label={t("editCat")}
            >
              <SquarePen size={18} />
            </Link>
          )}
        </div>
        {cat.description && <p className="pt-3 text-sm text-foreground/80">{cat.description}</p>}
      </header>

      {withPhotos.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted">{t("noSightings")}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 px-3">
          {withPhotos.map((entry) => (
            <CatEntryGridCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
