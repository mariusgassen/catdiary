"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { DevelopingPhoto } from "@/components/DevelopingPhoto";
import { callNumber, frameInk, type FrameStyle } from "@/lib/frames";

type EntryFrameProps = {
  frameStyle: FrameStyle;
  photoUrls: string[]; // in position order; first photo is the cover
  name: string | null;
  breed: string | null;
  locationName?: string | null;
  date: Date;
  entryId: string;
  /** Color preset key for the frame chrome; null/absent = the frame's palette. */
  frameColor?: string | null;
  /** Hand-set tilt in degrees; null/absent = the auto, id-hashed tilt. */
  frameTilt?: number | null;
  /** Custom text for the frame's label (call no. / ticket line / greeting). */
  frameCaption?: string | null;
  /** When set, the caption name links to the entry detail page. */
  captionHref?: string;
  onPhotoClick?: () => void;
  onPhotoDoubleClick?: () => void;
  /** A static, non-interactive render (no carousel, no links) — used by the
      frame picker to preview each style on the user's own photo. */
  preview?: boolean;
};

/* Each artifact sits slightly crooked, like it was glued in by hand. The tilt
   is derived from the entry id so it's stable across renders; index cards and
   postcards lie flatter than a tossed-down polaroid. */
function tiltFor(id: string, tilts: string[]): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return tilts[Math.abs(hash) % tilts.length];
}

/**
 * Renders an entry's photos as a chosen journal artifact — the taped polaroid,
 * a pressed-specimen card, a library index card, a postcard, or a ticket stub.
 * The photo carousel (scroll, counter, paw-on-double-tap) is shared across all
 * frames; only the surrounding chrome and caption change.
 */
export function EntryFrame({
  frameStyle,
  photoUrls,
  name,
  breed,
  locationName,
  date,
  entryId,
  frameColor,
  frameTilt,
  frameCaption,
  captionHref,
  onPhotoClick,
  onPhotoDoubleClick,
  preview = false,
}: EntryFrameProps) {
  const t = useTranslations("card");
  const locale = useLocale();
  const [photoIndex, setPhotoIndex] = useState(0);
  const filmRef = useRef<HTMLDivElement>(null);

  // Customizations: a chosen ink recolors the frame's signature chrome; a
  // hand-set tilt overrides the id-hashed one (and shows even in the picker
  // preview, so the tilt slider is live). Custom-vs-auto tilt is decided here so
  // each frame just consumes `tiltClass`/`tiltStyle`.
  const ink = frameInk(frameColor);
  const customTilt = typeof frameTilt === "number";
  const tiltStyle: CSSProperties | undefined = customTilt
    ? { transform: `rotate(${frameTilt}deg)` }
    : undefined;
  // Tailwind's ring color is the `--tw-ring-color` custom property — setting it
  // inline overrides the frame's `ring-[...]` class while keeping ring width.
  const ringStyle = ink ? ({ "--tw-ring-color": ink } as CSSProperties) : undefined;
  const caption = frameCaption?.trim() || null;

  function handleFilmScroll() {
    const el = filmRef.current;
    if (!el) return;
    setPhotoIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  const catName = name ?? t("aCatIMet");
  const dateStr = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(date);
  const stampDate = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(date);
  const multi = !preview && photoUrls.length > 1;

  // ── Shared photo film ──────────────────────────────────────────────────────
  const film: ReactNode = preview ? (
    // The img is absolutely pinned to the aspect-square box rather than sized
    // with h-full: iOS Safari otherwise lets a replaced child keep its intrinsic
    // (portrait) height and stretches the frame vertically.
    <div className="relative aspect-square w-full overflow-hidden bg-accent-soft">
      {photoUrls[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrls[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex select-none items-center justify-center text-3xl">🐱</div>
      )}
    </div>
  ) : photoUrls.length > 0 ? (
    <div
      ref={filmRef}
      onScroll={handleFilmScroll}
      className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {photoUrls.map((url, i) => (
        <DevelopingPhoto
          key={url}
          src={url}
          alt={name ? t("photoAlt", { name, n: i + 1 }) : t("aCatPhotoAlt", { n: i + 1 })}
          loading={i === 0 ? "eager" : "lazy"}
          frameClassName={`h-full w-full shrink-0 snap-center ${captionHref ? "cursor-pointer" : ""}`}
          imgClassName="h-full w-full object-cover"
          onClick={onPhotoClick}
          onDoubleClick={onPhotoDoubleClick}
        />
      ))}
    </div>
  ) : (
    <div className="flex aspect-square w-full select-none items-center justify-center bg-accent-soft text-6xl">🐱</div>
  );

  const counterBadge = multi ? (
    <span className="absolute right-3 top-3 z-10 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur-sm">
      {photoIndex + 1}/{photoUrls.length}
    </span>
  ) : null;

  const dots = multi ? (
    <div className="flex items-center justify-center gap-1 pt-1.5" aria-hidden>
      {photoUrls.map((url, i) => (
        <span
          key={url}
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            i === photoIndex ? "bg-accent" : "bg-[#d8cfbe] dark:bg-[#bdb39e]"
          }`}
        />
      ))}
    </div>
  ) : null;

  const nameNode = captionHref ? (
    <Link href={captionHref} className="hover:underline">
      {catName}
    </Link>
  ) : (
    <span>{catName}</span>
  );

  // ── Frame chrome ───────────────────────────────────────────────────────────
  switch (frameStyle) {
    case "SPECIMEN": {
      const tiltClass = customTilt || preview ? "" : tiltFor(entryId, ["-rotate-1", "rotate-1", "rotate-[0.75deg]"]);
      return (
        <figure className={`relative mx-auto w-[88%] ${tiltClass}`} style={tiltStyle}>
          {multi && (
            <span className="frame-specimen absolute inset-0 translate-x-1.5 translate-y-1 -rotate-1 shadow-sm" aria-hidden />
          )}
          <div className="frame-specimen relative p-3 pb-3.5 shadow-md ring-1 ring-[#d8cbac] dark:ring-[#3a352c]" style={ringStyle}>
            <div className="relative">
              {film}
              {counterBadge}
              <span className="photo-corner photo-corner-tl" aria-hidden />
              <span className="photo-corner photo-corner-tr" aria-hidden />
              <span className="photo-corner photo-corner-bl" aria-hidden />
              <span className="photo-corner photo-corner-br" aria-hidden />
            </div>
            {!preview && (
              <figcaption className="pt-2 text-center text-[#4a4031] dark:text-[#d8cdb6]">
                <span className="block text-[13px] italic leading-snug">{nameNode}</span>
                {breed && (
                  <span className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7d6b] dark:text-[#a89a82]">
                    {breed}
                  </span>
                )}
                <span className="mt-1 block text-[9px] uppercase tracking-[0.18em] text-[#a89a82] dark:text-[#8c8268]">
                  {dateStr}
                  {locationName ? ` · ${locationName}` : ""}
                </span>
              </figcaption>
            )}
            {dots}
          </div>
        </figure>
      );
    }

    case "INDEX_CARD": {
      const tiltClass = customTilt || preview ? "" : tiltFor(entryId, ["-rotate-[0.5deg]", "rotate-[0.5deg]", "rotate-0"]);
      return (
        <figure className={`relative mx-auto w-[88%] ${tiltClass}`} style={tiltStyle}>
          <div className="relative overflow-hidden bg-[#fbf7ec] shadow-md ring-1 ring-[#e0d8c4] dark:bg-[#23262d] dark:ring-[#343842]" style={ringStyle}>
            <div
              className="flex items-center justify-between border-b-2 border-[#d9534f]/45 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#9a8f78] dark:text-[#8c93a1]"
              style={ink ? { borderColor: ink } : undefined}
            >
              <span>{t("frames.callNo")}</span>
              <span className="text-[#5a5240] dark:text-[#c2c7d0]" style={ink ? { color: ink } : undefined}>
                {caption ?? callNumber(entryId)}
              </span>
            </div>
            <div className="relative">
              {film}
              {counterBadge}
            </div>
            {!preview && (
              <figcaption className="space-y-0.5 px-3 py-2 font-mono text-[#4a4031] dark:text-[#c2c7d0]">
                <div className="text-[13px] font-semibold leading-tight">{nameNode}</div>
                {breed && <div className="text-[11px] text-[#8a7d6b] dark:text-[#9aa0ab]">{breed}</div>}
                <div className="text-[10px] text-[#a89a82] dark:text-[#7f8593]">
                  {dateStr}
                  {locationName ? ` · ${locationName}` : ""}
                </div>
              </figcaption>
            )}
            {dots}
          </div>
        </figure>
      );
    }

    case "POSTCARD": {
      const tiltClass = customTilt || preview ? "" : tiltFor(entryId, ["-rotate-[0.75deg]", "rotate-[0.75deg]", "rotate-0"]);
      const greeting =
        caption ?? (locationName ? t("frames.greetingsFrom", { place: locationName }) : t("frames.greetings"));
      return (
        <figure className={`relative mx-auto w-[90%] ${tiltClass}`} style={tiltStyle}>
          <div className="relative overflow-hidden bg-[#fffdf6] shadow-md ring-1 ring-[#e6dcc4] dark:bg-[#23262d] dark:ring-[#343842]" style={ringStyle}>
            <div className="relative">
              {film}
              {counterBadge}
              {/* Postage stamp + a rubber-stamp postmark in the corner.
                  Decorative overlays stay click-through so paw/open gestures
                  still reach the photo underneath. */}
              <div className="pointer-events-none absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
                <span className="postage-stamp" aria-hidden>🐾</span>
                {!preview && (
                  <time className="stamp bg-white/85 px-1.5 py-0.5 text-[9px] font-semibold text-[#3a3128]">
                    {stampDate}
                  </time>
                )}
              </div>
              {/* "Greetings from …" banner along the bottom of the photo */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-8">
                <p className="text-center text-[15px] font-extrabold uppercase tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                  {greeting}
                </p>
              </div>
            </div>
            {!preview && (
              <figcaption className="px-3 py-2 text-center text-sm font-medium text-[#4a4031] dark:text-[#d8cdb6]">
                {nameNode}
                {breed && <span className="font-normal text-[#8a7d6b]"> · {breed}</span>}
              </figcaption>
            )}
            {dots}
          </div>
        </figure>
      );
    }

    case "TICKET": {
      const tiltClass = customTilt || preview ? "" : tiltFor(entryId, ["-rotate-1", "rotate-1", "rotate-[0.5deg]"]);
      return (
        <figure className={`relative mx-auto w-[88%] ${tiltClass}`} style={tiltStyle}>
          <div className="relative overflow-hidden rounded-md bg-[#fbf6ea] shadow-md ring-1 ring-[#e0d6bf] dark:bg-[#23262d] dark:ring-[#343842]" style={ringStyle}>
            <div
              className="flex items-center justify-between bg-[#3a3128] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#f4ead3]"
              style={ink ? { backgroundColor: ink } : undefined}
            >
              <span>{caption ?? t("frames.admitOne")}</span>
              <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-[#f4ead3]/70" aria-hidden />
            </div>
            <div className="relative">
              {film}
              {counterBadge}
            </div>
            <div className="ticket-perf" aria-hidden />
            {!preview && (
              <figcaption className="px-3 pb-2 pt-2.5 text-center font-mono text-[#4a4031] dark:text-[#d8cdb6]">
                <div className="text-[13px] font-bold uppercase tracking-wide leading-tight">{nameNode}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-[#a89a82] dark:text-[#8c8268]">
                  {dateStr}
                  {locationName ? ` · ${locationName}` : ""}
                </div>
              </figcaption>
            )}
            {dots}
          </div>
        </figure>
      );
    }

    // POLAROID — the default journal artifact
    default: {
      const tiltClass = customTilt || preview ? "" : tiltFor(entryId, ["-rotate-1", "rotate-1", "-rotate-[1.5deg]", "rotate-[0.75deg]"]);
      return (
        <figure className={`relative mx-auto w-[88%] ${tiltClass}`} style={tiltStyle}>
          {multi && (
            <span
              className="absolute inset-0 translate-x-1.5 translate-y-1 rotate-1 bg-white shadow-sm dark:bg-[#e4dccb]"
              aria-hidden
            />
          )}
          {/* The polaroid is white card stock; a chosen ink shows as a keyline mat. */}
          <div
            className="relative bg-white p-2 pb-2.5 shadow-md dark:bg-[#efe8da]"
            style={ink ? { borderColor: ink, borderWidth: 2, borderStyle: "solid" } : undefined}
          >
            <span className="tape-strip" aria-hidden />
            <div className="relative">
              {film}
              {counterBadge}
            </div>
            {!preview && (
              <figcaption className="pt-1.5 text-center text-sm font-medium leading-none text-[#3a3128]">
                {nameNode}
                {breed && <span className="font-normal text-[#8a7d6b]"> · {breed}</span>}
              </figcaption>
            )}
            {dots}
          </div>
        </figure>
      );
    }
  }
}
