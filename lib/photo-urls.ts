// Pure mapping from stored photo rows to display URLs — shared by server
// pages and client components, so it must stay free of server-only imports.

/** Hard cap on photos per entry — shared by the capture UI, lib and API schema. */
export const MAX_PHOTOS_PER_ENTRY = 10;

export type EntryPhoto = { photoKey: string; thumbKey?: string | null };

/**
 * Display URLs for an entry's photos, in position order. Feeds and grids want
 * thumbnails; the detail page and OG images want the originals (`full`).
 */
export function photoUrlsFor(photos: EntryPhoto[], opts?: { full?: boolean }): string[] {
  return photos.map((p) => `/api/photos/${opts?.full ? p.photoKey : (p.thumbKey ?? p.photoKey)}`);
}
