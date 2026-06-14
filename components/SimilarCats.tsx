"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { displayNameFor } from "@/lib/userDisplay";
import { DevelopingPhoto } from "@/components/DevelopingPhoto";

type SimilarEntry = {
  id: string;
  photoKey: string | null;
  thumbKey: string | null;
  name: string | null;
  breed: string | null;
  ownerDisplayName: string | null;
  ownerUsername: string | null;
};

/**
 * "Cats that look alike" — nearest neighbours of this entry's cover photo
 * (CLIP embeddings, cosine distance), rendered as a strip of small prints.
 * Fetched client-side so the diary page itself doesn't wait on the search.
 */
export function SimilarCats({ entryId }: { entryId: string }) {
  const t = useTranslations("cats");
  const [entries, setEntries] = useState<SimilarEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cat-entries/${entryId}/similar`)
      .then((res) => (res.ok ? res.json() : { entries: [] }))
      .then((data: { entries: SimilarEntry[] }) => {
        if (!cancelled) setEntries(data.entries);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  if (!entries || entries.length === 0) return null;

  return (
    <section className="mx-3">
      <div className="flex items-center gap-3 pb-3">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("similarTitle")}</h2>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {entries.map((entry, i) => {
          const photoKey = entry.thumbKey ?? entry.photoKey;
          const ownerName = displayNameFor({
            displayName: entry.ownerDisplayName,
            username: entry.ownerUsername,
          });
          return (
            <Link
              key={entry.id}
              href={`/cat-entries/${entry.id}`}
              className={`w-28 shrink-0 bg-white p-1.5 pb-2 shadow-md dark:bg-[#efe8da] ${
                i % 2 === 0 ? "rotate-1" : "-rotate-1"
              } transition-transform active:scale-95`}
            >
              {photoKey ? (
                <DevelopingPhoto
                  src={`/api/photos/${photoKey}`}
                  alt={entry.name ?? t("similarAlt")}
                  loading="lazy"
                  frameClassName="aspect-square w-full"
                  imgClassName="h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full select-none items-center justify-center bg-accent-soft text-3xl">
                  🐱
                </div>
              )}
              <p className="truncate pt-1.5 text-center text-xs font-medium leading-tight text-[#3a3128]">
                {entry.name ?? t("untitled")}
              </p>
              <p className="truncate text-center text-[10px] leading-tight text-[#8a7d6b]">{ownerName}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
