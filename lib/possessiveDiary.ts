/**
 * Generate grammatically correct possessive diary form based on language and name.
 *
 * English grammar:
 * - Names ending in 's': "Marius' diary" (apostrophe only)
 * - Other names: "Dominique's diary" (apostrophe + s)
 *
 * German grammar:
 * - Names ending in 's': "Marius Tagebuch" (no possessive s)
 * - Other names: "Dominiques Tagebuch" (possessive s)
 */

export function possessiveDiaryEn(name: string): string {
  return name.endsWith("s") ? `${name}' diary` : `${name}'s diary`;
}

export function possessiveDiaryDe(name: string): string {
  return name.endsWith("s") ? `${name} Tagebuch` : `${name}s Tagebuch`;
}

/**
 * Generate grammatically correct possessive diary title based on language and name.
 * Used for profile page titles like "Marius' Diary" or "Dominique's Diary"
 */

export function possessiveDiaryTitleEn(name: string): string {
  return name.endsWith("s") ? `${name}' Diary` : `${name}'s Diary`;
}

export function possessiveDiaryTitleDe(name: string): string {
  return name.endsWith("s") ? `${name} Tagebuch` : `${name}s Tagebuch`;
}
