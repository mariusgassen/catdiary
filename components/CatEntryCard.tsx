"use client";

import Link from "next/link";
import { useState } from "react";
import { PawPrint, MessageSquareText, Share2, MapPin, Pencil } from "lucide-react";
import { HashtagCaption } from "@/components/HashtagCaption";

type CatEntryCardProps = {
  entry: {
    id: string;
    name: string | null;
    breed: string | null;
    notes: string | null;
    latitude: number;
    longitude: number;
    createdAt: string | Date;
    photoUrl?: string | null;
    owner: { id: string; displayName: string; avatarKey?: string | null; image?: string | null };
    _count?: { likes: number; comments: number };
  };
  viewerId?: string | null;
};

const STAMP_DATE = new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" });

function formatCoords(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lng).toFixed(2)}° ${ew}`;
}

/* Each photo sits slightly crooked, like it was glued in by hand.
   Derive the tilt from the entry id so it's stable across renders. */
function tiltFor(id: string): string {
  const tilts = ["-rotate-1", "rotate-1", "-rotate-[1.5deg]", "rotate-[0.75deg]"];
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return tilts[Math.abs(hash) % tilts.length];
}

function Avatar({ user }: { user: { displayName: string; image?: string | null } }) {
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt={user.displayName} className="w-6 h-6 rounded-full object-cover" />;
  }
  return (
    <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center text-accent text-[11px] font-semibold select-none">
      {user.displayName[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function CatEntryCard({ entry, viewerId }: CatEntryCardProps) {
  const date = new Date(entry.createdAt);
  const isOwner = viewerId != null && viewerId === entry.owner.id;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(entry._count?.likes ?? 0);
  const commentCount = entry._count?.comments ?? 0;

  function handleLike() {
    setLiked((prev) => !prev);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  }

  return (
    <article className="relative mx-3 rounded-xl border border-border bg-surface px-4 pt-3.5 pb-3 shadow-sm">
      {/* Page header: whose diary + rubber-stamped date */}
      <div className="flex items-center justify-between gap-3 pb-3">
        <Link href={`/profile/${entry.owner.id}`} className="flex min-w-0 items-center gap-2 group">
          <Avatar user={entry.owner} />
          <span className="truncate text-sm font-semibold text-foreground group-hover:underline">
            {entry.owner.displayName}&rsquo;s diary
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {isOwner && (
            <Link
              href={`/cat-entries/${entry.id}/edit`}
              className="p-1 text-muted hover:text-foreground transition-colors"
              aria-label="Edit entry"
            >
              <Pencil size={14} />
            </Link>
          )}
          <time className="stamp px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            {STAMP_DATE.format(date)}
          </time>
        </div>
      </div>

      {/* Taped-in polaroid */}
      <figure className={`relative mx-auto mb-3 mt-2 w-[88%] bg-white p-2 pb-2.5 shadow-md dark:bg-[#efe8da] ${tiltFor(entry.id)}`}>
        <span className="tape-strip" aria-hidden />
        {entry.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.photoUrl}
            alt={entry.name ?? "A cat"}
            className="w-full aspect-square object-cover bg-accent-soft"
            onDoubleClick={handleLike}
          />
        ) : (
          <div className="flex aspect-square w-full select-none items-center justify-center bg-accent-soft text-6xl">
            🐱
          </div>
        )}
        <figcaption className="pt-1.5 text-center text-sm font-medium leading-none text-[#3a3128]">
          {entry.name ?? "A cat I met"}
          {entry.breed && <span className="font-normal text-[#8a7d6b]"> · {entry.breed}</span>}
        </figcaption>
      </figure>

      {/* Diary text */}
      {entry.notes && (
        <p className="pb-2.5 text-[15px] leading-relaxed text-foreground">
          <HashtagCaption text={entry.notes} />
        </p>
      )}

      {/* Footer: where it happened + reactions */}
      <div className="flex items-center justify-between border-t border-dashed border-border pt-2 text-muted">
        <p className="flex min-w-0 items-center gap-1 text-xs">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{formatCoords(entry.latitude, entry.longitude)}</span>
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all active:scale-90 ${
              liked ? "text-accent" : "hover:text-foreground"
            }`}
            aria-label={liked ? "Remove paw" : "Leave a paw"}
          >
            <PawPrint size={16} strokeWidth={1.75} fill={liked ? "currentColor" : "none"} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          <button
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:text-foreground transition-colors"
            aria-label="Margin notes"
          >
            <MessageSquareText size={16} strokeWidth={1.75} />
            {commentCount > 0 && <span>{commentCount}</span>}
          </button>
          <button className="rounded-lg px-2 py-1 hover:text-foreground transition-colors" aria-label="Share">
            <Share2 size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </article>
  );
}
