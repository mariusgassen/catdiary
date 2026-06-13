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
