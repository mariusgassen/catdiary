"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PawPrint, MessageSquareText, Share2, MapPin, Pencil, Check } from "lucide-react";
import { HashtagCaption } from "@/components/HashtagCaption";
import { displayNameFor } from "@/lib/userDisplay";

type CatEntryCardProps = {
  entry: {
    id: string;
    name: string | null;
    breed: string | null;
    notes: string | null;
    locationName?: string | null;
    latitude: number | null;
    longitude: number | null;
    createdAt: string | Date;
    photoUrl?: string | null;
    owner: {
      id: string;
      displayName: string | null;
      username?: string | null;
      avatarKey?: string | null;
      image?: string | null;
    };
    _count?: { likes: number; comments: number };
    likes?: { userId: string }[]; // the viewer's own like row, if any
  };
  viewerId?: string | null;
};

const STAMP_DATE = new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" });

/* Each photo sits slightly crooked, like it was glued in by hand.
   Derive the tilt from the entry id so it's stable across renders. */
function tiltFor(id: string): string {
  const tilts = ["-rotate-1", "rotate-1", "-rotate-[1.5deg]", "rotate-[0.75deg]"];
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return tilts[Math.abs(hash) % tilts.length];
}

function Avatar({ user }: { user: { displayName: string | null; username?: string | null; image?: string | null } }) {
  const name = displayNameFor(user);
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt={name} className="w-6 h-6 rounded-full object-cover" />;
  }
  return (
    <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center text-accent text-[11px] font-semibold select-none">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function CatEntryCard({ entry, viewerId }: CatEntryCardProps) {
  const router = useRouter();
  const date = new Date(entry.createdAt);
  const isOwner = viewerId != null && viewerId === entry.owner.id;
  const [liked, setLiked] = useState((entry.likes?.length ?? 0) > 0);
  const [likeCount, setLikeCount] = useState(entry._count?.likes ?? 0);
  const [shared, setShared] = useState(false);
  const commentCount = entry._count?.comments ?? 0;

  // Place name in the UI — never raw coordinates. Entries that have a pin but
  // no resolved name (older entries) get a generic label; the map still has them.
  const hasPin = entry.latitude != null && entry.longitude != null;
  const placeLabel = entry.locationName ?? (hasPin ? "Pinned on the map" : null);

  async function handleLike() {
    if (!viewerId) {
      router.push(`/sign-in?callbackUrl=/cat-entries/${entry.id}`);
      return;
    }
    // Optimistic toggle; reconcile with (or revert to) the server's answer.
    const prev = { liked, likeCount };
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    try {
      const res = await fetch(`/api/cat-entries/${entry.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data: { liked: boolean; likeCount: number } = await res.json();
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(prev.liked);
      setLikeCount(prev.likeCount);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/cat-entries/${entry.id}`;
    const title = entry.name ? `${entry.name} — Cat Diary` : "A cat diary entry";
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  return (
    <article className="relative mx-3 rounded-xl border border-border bg-surface px-4 pt-3.5 pb-3 shadow-sm">
      {/* Page header: whose diary + rubber-stamped date */}
      <div className="flex items-center justify-between gap-3 pb-3">
        <Link href={`/profile/${entry.owner.id}`} className="flex min-w-0 items-center gap-2 group">
          <Avatar user={entry.owner} />
          <span className="truncate text-sm font-semibold text-foreground group-hover:underline">
            {displayNameFor(entry.owner)}&rsquo;s diary
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
          <Link href={`/cat-entries/${entry.id}`} className="hover:underline">
            {entry.name ?? "A cat I met"}
          </Link>
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
        {placeLabel ? (
          <p className="flex min-w-0 items-center gap-1 text-xs">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{placeLabel}</span>
          </p>
        ) : (
          <span aria-hidden />
        )}
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
          <Link
            href={`/cat-entries/${entry.id}`}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:text-foreground transition-colors"
            aria-label="Margin notes"
          >
            <MessageSquareText size={16} strokeWidth={1.75} />
            {commentCount > 0 && <span>{commentCount}</span>}
          </Link>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:text-foreground transition-colors"
            aria-label="Share"
          >
            {shared ? <Check size={15} strokeWidth={2} className="text-accent" /> : <Share2 size={15} strokeWidth={1.75} />}
            {shared && <span className="text-accent">Copied</span>}
          </button>
        </div>
      </div>
    </article>
  );
}
