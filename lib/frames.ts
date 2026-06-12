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
