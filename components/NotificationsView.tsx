"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Heart, MessageCircle, UserPlus, AtSign, ArrowLeft, CheckCheck } from "lucide-react";
import type { GroupedNotification, NotificationActor } from "@/lib/notifications";
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

function actorLabel(actors: NotificationActor[], actorCount: number): string {
  const names = actors.slice(0, 2).map((a) => displayNameFor(a));
  const remaining = actorCount - names.length;
  if (remaining > 0) {
    return `${names.join(", ")} and ${remaining} other${remaining === 1 ? "" : "s"}`;
  }
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return names[0] ?? "Someone";
}

function groupedText(g: GroupedNotification): string {
  const actor = actorLabel(g.actors, g.actorCount);
  switch (g.type) {
    case "LIKE":
      return `${actor} pawed your entry`;
    case "COMMENT":
      return `${actor} left a note`;
    case "REPLY":
      return `${actor} replied to your note`;
    case "FOLLOW":
      return g.actorCount === 1
        ? `${actor} is now reading your diary`
        : `${actor} are now reading your diary`;
    case "MENTION":
      return `${actor} mentioned you`;
    default:
      return `${actor} interacted with your diary`;
  }
}

function groupedHref(g: GroupedNotification): string {
  if (g.type === "FOLLOW" && g.actors.length === 1) return `/profile/${g.actors[0].id}`;
  if (g.type === "FOLLOW") return "/notifications";
  if (g.catEntryId) return `/cat-entries/${g.catEntryId}`;
  return "/notifications";
}

function AvatarBubble({ actor, size = 10 }: { actor: NotificationActor; size?: number }) {
  const src = actor.avatarKey ? `/api/photos/${actor.avatarKey}` : actor.image;
  const initials = (displayNameFor(actor)[0] ?? "?").toUpperCase();
  const cls = `rounded-full object-cover ring-2 ring-background`;
  const dim = `w-${size} h-${size}`;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`${dim} ${cls} shrink-0`} />;
  }
  return (
    <div className={`${dim} ${cls} shrink-0 bg-accent-soft flex items-center justify-center text-accent font-semibold text-sm select-none`}>
      {initials}
    </div>
  );
}

function ActorStack({ actors, actorCount }: { actors: NotificationActor[]; actorCount: number }) {
  const shown = actors.slice(0, 2);
  return (
    <div className="relative shrink-0" style={{ width: shown.length > 1 ? 44 : 40, height: 40 }}>
      {shown.length > 1 ? (
        <>
          <div className="absolute bottom-0 left-0">
            <AvatarBubble actor={shown[1]} size={8} />
          </div>
          <div className="absolute top-0 right-0">
            <AvatarBubble actor={shown[0]} size={8} />
          </div>
          {actorCount > 2 && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-0.5 text-[9px] font-bold text-background">
              +{actorCount - 1}
            </span>
          )}
        </>
      ) : (
        <AvatarBubble actor={shown[0]} size={10} />
      )}
    </div>
  );
}

function CoverThumb({ g }: { g: GroupedNotification }) {
  const photo = g.catEntry?.photos?.[0];
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

function NotificationRow({
  g,
  onRead,
}: {
  g: GroupedNotification;
  onRead: (ids: string[]) => void;
}) {
  const type = g.type as keyof typeof TYPE_ICON;
  const Icon = TYPE_ICON[type] ?? Bell;
  const iconColor = (TYPE_COLOR as Record<string, string>)[type] ?? "text-muted";

  return (
    <Link
      href={groupedHref(g)}
      onClick={() => { if (!g.isRead) onRead(g.notificationIds); }}
      className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface ${!g.isRead ? "bg-accent-soft/30" : ""}`}
    >
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: 44, height: 40 }}>
        <ActorStack actors={g.actors} actorCount={g.actorCount} />
        <span className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface ring-2 ring-background ${iconColor}`}>
          <Icon size={10} strokeWidth={2.5} />
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={`text-sm leading-snug ${!g.isRead ? "font-semibold" : ""}`}>
          {groupedText(g)}
        </p>
        {g.comment && (
          <p className="truncate text-xs text-muted italic">
            &ldquo;{g.comment.body.slice(0, 60)}{g.comment.body.length > 60 ? "…" : ""}&rdquo;
          </p>
        )}
        <span className="text-xs text-muted">{relativeTime(g.latestAt)}</span>
      </div>

      <CoverThumb g={g} />
    </Link>
  );
}

export function NotificationsView({
  initialNotifications,
}: {
  initialNotifications: GroupedNotification[];
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function markRead(ids: string[]) {
    setNotifications((prev) =>
      prev.map((n) =>
        n.notificationIds.some((id) => ids.includes(id)) ? { ...n, isRead: true } : n,
      ),
    );
    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  }

  async function markAllRead() {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      router.refresh();
    } finally {
      setMarkingAll(false);
    }
  }

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
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              disabled={markingAll}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent-soft disabled:opacity-50"
              aria-label="Mark all as read"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-[480px] divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted">
            <Bell size={32} strokeWidth={1.5} />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((g) => (
            <NotificationRow key={g.key} g={g} onRead={markRead} />
          ))
        )}
      </div>
    </div>
  );
}
