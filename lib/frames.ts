// Journal-artifact frames an entry's photos can be presented as. This is the
// single source of truth for the frame catalog — shared by the schema-backed
// type, the render layer (EntryFrame), and the picker. A frame is purely a
// presentation choice: it never gates documenting, so there is always a
// sensible default and unknown values fall back to it.
//
// Kept free of JSX / server-only imports so it can be used anywhere.

export const FRAME_STYLES = [
  "POLAROID",
  "SPECIMEN",
  "INDEX_CARD",
  "POSTCARD",
  "TICKET",
] as const;

export type FrameStyle = (typeof FRAME_STYLES)[number];

export const DEFAULT_FRAME_STYLE: FrameStyle = "POLAROID";

/** Narrows any value (API input, stored string) to a known frame, defaulting. */
export function asFrameStyle(value: unknown): FrameStyle {
  return FRAME_STYLES.includes(value as FrameStyle)
    ? (value as FrameStyle)
    : DEFAULT_FRAME_STYLE;
}

// ── Frame color ─────────────────────────────────────────────────────────────
// A curated, on-brand palette for recoloring a frame's chrome (its ring, the
// index card's margin rule, the ticket's header bar, …). Storing a preset key
// rather than a free hex keeps the field-journal look intact in both themes and
// avoids validating arbitrary user color input. `DEFAULT` means "leave the
// frame's own palette alone". Each ink is picked to read on cream *and* dark.

export const FRAME_COLOR_KEYS = [
  "DEFAULT",
  "BLUE",
  "RED",
  "GREEN",
  "AMBER",
  "VIOLET",
  "INK",
] as const;

export type FrameColorKey = (typeof FRAME_COLOR_KEYS)[number];

export const DEFAULT_FRAME_COLOR: FrameColorKey = "DEFAULT";

const FRAME_INKS: Record<Exclude<FrameColorKey, "DEFAULT">, string> = {
  BLUE: "#3f6fb0",
  RED: "#b3503f",
  GREEN: "#5a7d4f",
  AMBER: "#b0823f",
  VIOLET: "#7a5ba0",
  INK: "#4a4031",
};

/** Narrows any value to a known color preset, defaulting to DEFAULT. */
export function asFrameColor(value: unknown): FrameColorKey {
  return FRAME_COLOR_KEYS.includes(value as FrameColorKey)
    ? (value as FrameColorKey)
    : DEFAULT_FRAME_COLOR;
}

/** The hex ink for a color preset, or null for the frame's default palette. */
export function frameInk(value: unknown): string | null {
  const key = asFrameColor(value);
  return key === "DEFAULT" ? null : FRAME_INKS[key];
}

// ── Frame paper ─────────────────────────────────────────────────────────────
// Separate from the chrome color: this tints the card *stock* itself (the
// polaroid's white, the index card's cream, …) with a soft hue wash. It reuses
// the same color keys, but is applied as a translucent gradient laid over the
// frame's existing background so it adapts to both the light and dark themes
// (the wash is the same; only the paper underneath differs).

export const DEFAULT_FRAME_PAPER: FrameColorKey = "DEFAULT";

const PAPER_WASH_ALPHA = 0.16;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Narrows any value to a known paper preset (same keys as the color palette). */
export function asFramePaper(value: unknown): FrameColorKey {
  return asFrameColor(value);
}

/**
 * A CSS `background-image` value (a flat translucent wash) for the chosen paper
 * tint, layered over the frame's own opaque background — or null for the
 * default, untinted stock. Returned as a gradient because `background-image`
 * paints on top of the class-set `background-color`, keeping the paper solid.
 */
export function framePaperWash(value: unknown): string | null {
  const key = asFramePaper(value);
  if (key === "DEFAULT") return null;
  const rgba = hexToRgba(FRAME_INKS[key], PAPER_WASH_ALPHA);
  return `linear-gradient(${rgba}, ${rgba})`;
}

/** A pale swatch color for the paper picker (the wash over white). */
export function framePaperSwatch(value: unknown): string | null {
  const key = asFramePaper(value);
  return key === "DEFAULT" ? null : hexToRgba(FRAME_INKS[key], PAPER_WASH_ALPHA);
}

// ── Frame tilt ──────────────────────────────────────────────────────────────
// A hand-set tilt overrides the per-entry, id-hashed auto tilt. Kept to a small
// range so the journal still reads as "glued in by hand", not askew.

export const FRAME_TILT_MIN = -6;
export const FRAME_TILT_MAX = 6;

/** Clamps a tilt to the allowed range, or null for the auto (hashed) tilt. */
export function clampTilt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(FRAME_TILT_MIN, Math.min(FRAME_TILT_MAX, Math.round(value)));
}

// ── Frame caption ─────────────────────────────────────────────────────────────
// Some frames carry a small label that's otherwise auto-filled: the index card's
// library "call number", the ticket's "Admit one" line, and the postcard's
// "Greetings from …" banner. These are the frames whose label the user can
// override with their own text (the others — polaroid, specimen — have none).

export const FRAMES_WITH_CAPTION: readonly FrameStyle[] = ["INDEX_CARD", "POSTCARD", "TICKET"];

export const MAX_FRAME_CAPTION = 80;

/** Whether a frame style has a customizable label/caption field. */
export function frameHasCaption(style: FrameStyle): boolean {
  return FRAMES_WITH_CAPTION.includes(style);
}

// ── Frame label ───────────────────────────────────────────────────────────────
// A second text slot on the index card: the header *heading* to the left of the
// call number — "Call no." (German: "Signatur", the library shelf-mark term).
// Only the index card has this paired label/value layout, so it's the only
// frame with a customizable label.

export const FRAMES_WITH_LABEL: readonly FrameStyle[] = ["INDEX_CARD"];

export const MAX_FRAME_LABEL = 40;

/** Whether a frame style has a customizable header label field. */
export function frameHasLabel(style: FrameStyle): boolean {
  return FRAMES_WITH_LABEL.includes(style);
}

/**
 * A short, stable library "call number" for the index-card frame, derived from
 * the entry id. 636.8 is the real Dewey Decimal class for cats — a small joke
 * the catalog-card frame leans into. The cutter (two letters + two digits) is
 * hashed from the id so it's deterministic across renders.
 */
export function callNumber(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  hash = Math.abs(hash);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const cutter =
    letters[hash % 26] +
    letters[Math.floor(hash / 26) % 26] +
    String(hash % 90 + 10);
  return `636.8 ${cutter}`;
}
