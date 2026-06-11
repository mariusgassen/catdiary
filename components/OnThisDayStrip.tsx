"use client";

import Link from "next/link";
import { Clock } from "lucide-react";

type EntrySnippet = {
  id: string;
  name: string | null;
  createdAt: string | Date;
  photos: { photoKey: string; thumbKey: string | null }[];
};

function tiltFor(id: string): string {
  const tilts = ["-rotate-1", "rotate-1", "-rotate-[1.5deg]", "rotate-[0.75deg]"];
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return tilts[Math.abs(hash) % tilts.length];
}

export function OnThisDayStrip({ entries }: { entries: EntrySnippet[] }) {
  if (entries.length === 0) return null;

  const years = [...new Set(entries.map((e) => new Date(e.createdAt).getFullYear()))].sort();

  return (
    <section className="space-y-2 pt-2">
      <div className="flex items-center gap-2 px-4">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <Clock size={11} className="text-muted" aria-hidden />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          On This Day{years.length > 0 && ` · ${years.join(" · ")}`}
        </h2>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

      <div
        className="overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <ul className="flex gap-3 px-4" style={{ width: "max-content" }}>
          {entries.map((entry) => {
            const photo = entry.photos[0];
            const src = photo
              ? `/api/photos/${photo.thumbKey ?? photo.photoKey}`
              : null;

            return (
              <li key={entry.id}>
                <Link href={`/cat-entries/${entry.id}`} className="block">
                  <div
                    className={`relative w-[88px] bg-white dark:bg-[#efe8da] p-1 pb-6 shadow-sm transition-shadow hover:shadow-md ${tiltFor(entry.id)}`}
                  >
                    <div className="aspect-square w-full overflow-hidden">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt={entry.name ?? "A cat"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full select-none items-center justify-center bg-accent-soft text-3xl">
                          🐱
                        </div>
                      )}
                    </div>
                    <p className="absolute bottom-1 left-0 right-0 truncate px-1.5 text-center text-[10px] leading-tight text-[#3a3128]">
                      {entry.name ?? "A cat"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
