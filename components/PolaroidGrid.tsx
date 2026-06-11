"use client";

import Link from "next/link";
import { DevelopingPhoto } from "@/components/DevelopingPhoto";

type GridEntry = {
  id: string;
  name: string | null;
  breed: string | null;
  createdAt: string | Date;
  photoUrls?: string[];
};

/* Stable per-entry tilt — same algorithm as CatEntryCard */
function tiltFor(id: string): string {
  const tilts = ["-rotate-1", "rotate-1", "-rotate-[1.5deg]", "rotate-[0.75deg]"];
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return tilts[Math.abs(hash) % tilts.length];
}

function PolaroidCell({ entry }: { entry: GridEntry }) {
  const coverUrl = entry.photoUrls?.[0];
  const label = entry.name ?? "A cat I met";

  return (
    <Link
      href={`/cat-entries/${entry.id}`}
      className={`block transition-transform active:scale-95 ${tiltFor(entry.id)}`}
      aria-label={label}
    >
      <div className="relative bg-white p-1.5 pb-2 shadow-md dark:bg-[#efe8da]">
        <span className="tape-strip" aria-hidden />
        {coverUrl ? (
          <DevelopingPhoto
            src={coverUrl}
            alt={label}
            loading="lazy"
            frameClassName="aspect-square w-full"
            imgClassName="h-full w-full object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full select-none items-center justify-center bg-accent-soft text-4xl">
            🐱
          </div>
        )}
        <p className="pt-1 text-center text-[11px] font-medium leading-tight text-[#3a3128] truncate px-0.5">
          {label}
          {entry.breed && <span className="font-normal text-[#8a7d6b]"> · {entry.breed}</span>}
        </p>
      </div>
    </Link>
  );
}

export function PolaroidGrid({ entries }: { entries: GridEntry[] }) {
  return (
    <div className="grid grid-cols-2 gap-5 px-4 py-3">
      {entries.map((entry) => (
        <PolaroidCell key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
