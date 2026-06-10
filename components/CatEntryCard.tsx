"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
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

function relativeTime(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Avatar({ user }: { user: { displayName: string; image?: string | null } }) {
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt={user.displayName} className="w-8 h-8 rounded-full object-cover" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-accent text-sm font-semibold select-none">
      {user.displayName[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function CatEntryCard({ entry, viewerId }: CatEntryCardProps) {
  const date = new Date(entry.createdAt);
  const isOwner = viewerId != null && viewerId === entry.owner.id;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(entry._count?.likes ?? 0);

  function handleLike() {
    setLiked((prev) => !prev);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  }

  const caption = entry.notes || entry.name;

  return (
    <article className="border-b border-border bg-background">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Link href={`/profile/${entry.owner.id}`}>
          <Avatar user={entry.owner} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${entry.owner.id}`} className="text-sm font-semibold truncate hover:underline">
            {entry.owner.displayName}
          </Link>
          {(entry.name || entry.breed) && (
            <p className="text-xs text-muted truncate">
              {[entry.name, entry.breed].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <time className="text-xs text-muted">{relativeTime(date)}</time>
          {isOwner && (
            <Link
              href={`/cat-entries/${entry.id}/edit`}
              className="p-1 -m-1 text-muted hover:text-foreground transition-colors"
              aria-label="Edit entry"
            >
              <MoreHorizontal size={16} />
            </Link>
          )}
        </div>
      </div>

      {/* Photo */}
      {entry.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.photoUrl}
          alt={entry.name ?? "A cat"}
          className="w-full aspect-[4/5] object-cover bg-surface"
          onDoubleClick={handleLike}
        />
      ) : (
        <div className="w-full aspect-[4/5] bg-accent-soft flex items-center justify-center text-6xl select-none">
          🐱
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center px-1.5 pt-1 pb-0.5">
        <button
          onClick={handleLike}
          className={`p-2 transition-all active:scale-90 ${liked ? "text-red-500" : "text-foreground hover:text-muted"}`}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart size={24} strokeWidth={1.75} fill={liked ? "currentColor" : "none"} />
        </button>
        <button className="p-2 text-foreground hover:text-muted transition-colors" aria-label="Comment">
          <MessageCircle size={24} strokeWidth={1.75} />
        </button>
        <div className="flex-1" />
        <button className="p-2 text-foreground hover:text-muted transition-colors" aria-label="Share">
          <Share2 size={22} strokeWidth={1.75} />
        </button>
      </div>

      {/* Counts + caption */}
      <div className="px-3 pb-3 space-y-1">
        {likeCount > 0 && (
          <p className="text-sm font-semibold">{likeCount} {likeCount === 1 ? "like" : "likes"}</p>
        )}
        {caption && (
          <p className="text-sm leading-snug">
            <Link href={`/profile/${entry.owner.id}`} className="font-semibold mr-1.5">
              {entry.owner.displayName}
            </Link>
            <HashtagCaption text={caption} />
          </p>
        )}
        {(entry._count?.comments ?? 0) > 0 && (
          <p className="text-sm text-muted">
            View all {entry._count!.comments} comments
          </p>
        )}
        <p className="text-xs text-muted">{relativeTime(date)}</p>
      </div>
    </article>
  );
}
