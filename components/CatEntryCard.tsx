"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PawPrint, MessageSquareText, Share2, MapPin, SquarePen, Check } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { HashtagCaption } from "@/components/HashtagCaption";
import { EntryFrame } from "@/components/EntryFrame";
import { REACTION_ICON } from "@/components/ReactionStamp";
import { asFrameStyle } from "@/lib/frames";
import { asReactionKind, DEFAULT_REACTION_KIND, REACTION_KINDS, type ReactionKind } from "@/lib/reactions";
import { displayNameFor } from "@/lib/userDisplay";
import { possessiveDiaryEn, possessiveDiaryDe } from "@/lib/possessiveDiary";

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
    frameStyle?: string | null; // journal artifact the photos are framed as
    frameColor?: string | null; // chrome color preset for the frame
    frameTilt?: number | null; // hand-set tilt in degrees (null = auto)
    frameCaption?: string | null; // custom text for the frame's label field
    photoUrls?: string[]; // in position order; first photo is the cover
    owner: {
      id: string;
      displayName: string | null;
      username?: string | null;
      avatarKey?: string | null;
      image?: string | null;
    };
    _count?: { likes: number; comments: number };
    likes?: { userId: string; kind?: string | null }[]; // the viewer's own reaction row, if any
  };
  viewerId?: string | null;
  /** In the feed the card opens the entry on tap; on the detail page itself it
      is already the full view, so self-navigation is disabled. */
  linkToDetail?: boolean;
};

function Avatar({ user }: { user: { displayName: string | null; username?: string | null; avatarKey?: string | null; image?: string | null } }) {
  const name = displayNameFor(user);
  const src = user.avatarKey ? `/api/photos/${user.avatarKey}` : (user.image ?? null);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className="w-6 h-6 rounded-full object-cover" />;
  }
  return (
    <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center text-accent text-[11px] font-semibold select-none">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function CatEntryCard({ entry, viewerId, linkToDetail = true }: CatEntryCardProps) {
  const t = useTranslations("card");
  const locale = useLocale();
  const router = useRouter();
  const date = new Date(entry.createdAt);
  const stampDate = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" });
  const isOwner = viewerId != null && viewerId === entry.owner.id;
  const initialReaction = entry.likes?.[0] ? asReactionKind(entry.likes[0].kind) : null;
  const [reaction, setReaction] = useState<ReactionKind | null>(initialReaction);
  const [reactionTotal, setReactionTotal] = useState(entry._count?.likes ?? 0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const commentCount = entry._count?.comments ?? 0;

  const photoUrls = entry.photoUrls ?? [];
  // Single tap on the photo opens the entry; a double tap leaves a paw instead.
  // Delay the open just long enough to tell the two gestures apart.
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const possessiveDiary =
    locale === "de"
      ? possessiveDiaryDe(displayNameFor(entry.owner))
      : possessiveDiaryEn(displayNameFor(entry.owner));

  function handlePhotoClick() {
    if (!linkToDetail) return;
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      router.push(`/cat-entries/${entry.id}`);
    }, 250);
  }

  function handlePhotoDoubleClick() {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    // Double-tap is the quick gesture — it always leaves (or lifts) the plain paw.
    react(DEFAULT_REACTION_KIND);
  }

  // Place name in the UI — never raw coordinates. Entries that have a pin but
  // no resolved name (older entries) get a generic label; the map still has them.
  const hasPin = entry.latitude != null && entry.longitude != null;
  const placeLabel = entry.locationName ?? (hasPin ? t("pinnedOnMap") : null);

  // Leave / change / lift a reaction. Tapping the stamp you already left removes
  // it; picking a different one swaps it (total unchanged).
  async function react(kind: ReactionKind) {
    if (!viewerId) {
      router.push(`/sign-in?callbackUrl=/cat-entries/${entry.id}`);
      return;
    }
    setPickerOpen(false);
    navigator.vibrate?.([10]);

    const prev = { reaction, reactionTotal };
    const removing = reaction === kind;
    const switching = reaction != null && !removing;
    setReaction(removing ? null : kind);
    setReactionTotal((c) => (removing ? c - 1 : switching ? c : c + 1));

    try {
      const res = await fetch(`/api/cat-entries/${entry.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) throw new Error();
      const data: { reacted: boolean; kind: string | null; total: number } = await res.json();
      setReaction(data.reacted ? asReactionKind(data.kind) : null);
      setReactionTotal(data.total);
    } catch {
      setReaction(prev.reaction);
      setReactionTotal(prev.reactionTotal);
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
    <article
      // Tagged for the EngagementTracker only as a list card; the detail page
      // renders this with linkToDetail=false and tracks its own read depth.
      {...(linkToDetail ? { "data-entry-id": entry.id } : {})}
      className="relative mx-3 rounded-xl border border-border bg-surface px-4 pt-3.5 pb-3 shadow-sm"
    >
      {/* Page header: whose diary + rubber-stamped date */}
      <div className="flex items-center justify-between gap-3 pb-3">
        <Link href={`/profile/${entry.owner.id}`} className="flex min-w-0 items-center gap-2 group">
          <Avatar user={entry.owner} />
          <span className="truncate text-sm font-semibold text-foreground group-hover:underline">
            {possessiveDiary}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {isOwner && (
            <Link
              href={`/cat-entries/${entry.id}/edit`}
              className="p-1.5 -m-0.5 text-muted hover:text-foreground transition-colors"
              aria-label={t("editEntry")}
            >
              <SquarePen size={16} strokeWidth={1.75} />
            </Link>
          )}
          <time className="stamp px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            {stampDate.format(date)}
          </time>
        </div>
      </div>

      {/* The photos as a chosen journal artifact — taped polaroid by default,
          or a specimen card / index card / postcard / ticket stub. With more
          than one photo it becomes a little stack you can flip through. */}
      <div className="mb-3 mt-2">
        <EntryFrame
          frameStyle={asFrameStyle(entry.frameStyle)}
          frameColor={entry.frameColor}
          frameTilt={entry.frameTilt}
          frameCaption={entry.frameCaption}
          photoUrls={photoUrls}
          name={entry.name}
          breed={entry.breed}
          locationName={entry.locationName}
          date={date}
          entryId={entry.id}
          captionHref={linkToDetail ? `/cat-entries/${entry.id}` : undefined}
          onPhotoClick={handlePhotoClick}
          onPhotoDoubleClick={handlePhotoDoubleClick}
        />
      </div>

      {/* Diary text */}
      {entry.notes && (
        <p className="pb-2.5 text-[15px] leading-relaxed text-foreground">
          <HashtagCaption text={entry.notes} />
        </p>
      )}

      {/* Footer: where it happened + reactions */}
      <div className="flex items-center justify-between border-t border-dashed border-border pt-2 text-muted">
        {placeLabel ? (
          entry.latitude != null ? (
            <Link
              href={`/map?lat=${entry.latitude}&lng=${entry.longitude}`}
              className="flex min-w-0 items-center gap-1 text-xs hover:text-foreground transition-colors"
            >
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{placeLabel}</span>
            </Link>
          ) : (
            <p className="flex min-w-0 items-center gap-1 text-xs">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{placeLabel}</span>
            </p>
          )
        ) : (
          <span aria-hidden />
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          <div className="relative">
            {pickerOpen && (
              <>
                {/* Tap-away backdrop so the picker closes on an outside tap. */}
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setPickerOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute bottom-full right-0 z-20 mb-1.5 flex items-center gap-0.5 rounded-full border border-border bg-surface px-1.5 py-1 shadow-md"
                >
                  {REACTION_KINDS.map((kind) => {
                    const Icon = REACTION_ICON[kind];
                    const active = reaction === kind;
                    return (
                      <button
                        key={kind}
                        type="button"
                        role="menuitemradio"
                        onClick={() => react(kind)}
                        className={`rounded-full p-1.5 transition-all active:scale-90 ${
                          active ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground"
                        }`}
                        aria-label={t(`reactions.label.${kind}`)}
                        aria-checked={active}
                        title={t(`reactions.label.${kind}`)}
                      >
                        <Icon size={18} strokeWidth={1.75} fill={active ? "currentColor" : "none"} />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <button
              onClick={() => setPickerOpen((o) => !o)}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all active:scale-90 ${
                reaction ? "text-accent" : "hover:text-foreground"
              }`}
              aria-label={reaction ? t("reactions.changeReaction") : t("reactions.react")}
              aria-haspopup="menu"
              aria-expanded={pickerOpen}
            >
              {(() => {
                const Icon = reaction ? REACTION_ICON[reaction] : PawPrint;
                return <Icon size={16} strokeWidth={1.75} fill={reaction ? "currentColor" : "none"} />;
              })()}
              {reactionTotal > 0 && <span>{reactionTotal}</span>}
            </button>
          </div>
          {linkToDetail ? (
            <Link
              href={`/cat-entries/${entry.id}`}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:text-foreground transition-colors"
              aria-label={t("marginNotes")}
            >
              <MessageSquareText size={16} strokeWidth={1.75} />
              {commentCount > 0 && <span>{commentCount}</span>}
            </Link>
          ) : (
            <span
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium"
              aria-label={t("marginNotes")}
            >
              <MessageSquareText size={16} strokeWidth={1.75} />
              {commentCount > 0 && <span>{commentCount}</span>}
            </span>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:text-foreground transition-colors"
            aria-label={t("share")}
          >
            {shared ? <Check size={15} strokeWidth={2} className="text-accent" /> : <Share2 size={15} strokeWidth={1.75} />}
            {shared && <span className="text-accent">{t("copied")}</span>}
          </button>
        </div>
      </div>
    </article>
  );
}
