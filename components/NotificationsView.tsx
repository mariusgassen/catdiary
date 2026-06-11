"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Heart, MessageCircle, UserPlus, AtSign, ArrowLeft } from "lucide-react";
import type { NotificationWithDetails } from "@/lib/notifications";
import { displayNameFor } from "@/lib/userDisplay";

function relativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

const TYPE_ICON = {
  LIKE: Heart,
  COMMENT: MessageCircle,
  REPLY: MessageCircle,
  FOLLOW: UserPlus,
  MENTION: AtSign,
} as const;

const TYPE_COLOR = {
  LIKE: "text-rose-500",
  COMMENT: "text-accent",
  REPLY: "text-accent",
  FOLLOW: "text-emerald-500",
  MENTION: "text-accent",
} as const;

function notificationText(n: NotificationWithDetails): string {
  const actor = displayNameFor(n.actor);
  switch (n.type) {
    case "LIKE":
      return `${actor} pawed your entry`;
    case "COMMENT":
      return `${actor} left a note`;
    case "REPLY":
      return `${actor} replied to your note`;
    case "FOLLOW":
      return `${actor} is now reading your diary`;
    case "MENTION":
      return `${actor} mentioned you`;
    default:
      return `${actor} interacted with your diary`;
  }
}

function notificationHref(n: NotificationWithDetails): string {
  if (n.type === "FOLLOW") return `/profile/${n.actor.id}`;
  if (n.catEntryId) return `/cat-entries/${n.catEntryId}`;
  return "/notifications";
}

function AvatarBubble({ actor }: { actor: NotificationWithDetails["actor"] }) {
  const src = actor.avatarKey ? `/api/photos/${actor.avatarKey}` : actor.image;
  const initials = (displayNameFor(actor)[0] ?? "?").toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center text-accent font-semibold text-sm shrink-0 select-none">
      {initials}
    </div>
  );
}

function CoverThumb({ n }: { n: NotificationWithDetails }) {
  const photo = n.catEntry?.photos?.[0];
  if (!photo?.thumbKey) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/photos/${photo.thumbKey}`}
      alt=""
      className="w-10 h-10 rounded-lg object-cover shrink-0"
    />
  );
}

function NotificationRow({ n }: { n: NotificationWithDetails }) {
  const type = n.type as keyof typeof TYPE_ICON;
  const Icon = TYPE_ICON[type] ?? Bell;
  const iconColor = (TYPE_COLOR as Record<string, string>)[type] ?? "text-muted";

  return (
    <Link
      href={notificationHref(n)}
      className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface ${!n.read ? "bg-accent-soft/30" : ""}`}
    >
      <div className="relative shrink-0">
        <AvatarBubble actor={n.actor} />
        <span className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface ring-2 ring-background ${iconColor}`}>
          <Icon size={10} strokeWidth={2.5} />
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={`text-sm leading-snug ${!n.read ? "font-semibold" : ""}`}>
          {notificationText(n)}
        </p>
        {n.comment && (
          <p className="truncate text-xs text-muted italic">
            &ldquo;{n.comment.body.slice(0, 60)}{n.comment.body.length > 60 ? "…" : ""}&rdquo;
          </p>
        )}
        <span className="text-xs text-muted">{relativeTime(n.createdAt)}</span>
      </div>

      <CoverThumb n={n} />
    </Link>
  );
}

export function NotificationsView({
  initialNotifications,
}: {
  initialNotifications: NotificationWithDetails[];
}) {
  const [notifications] = useState(initialNotifications);

  return (
    <div className="flex flex-col min-h-0">
      <header className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-[480px] flex items-center gap-3 px-4 h-14">
          <Link
            href="/feed"
            aria-label="Back"
            className="p-1.5 -m-1.5 text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold tracking-tight flex-1">Notifications</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[480px] divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted">
            <Bell size={32} strokeWidth={1.5} />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => <NotificationRow key={n.id} n={n} />)
        )}
      </div>
    </div>
  );
}
