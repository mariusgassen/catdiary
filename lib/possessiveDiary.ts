/**
 * Grammatically correct possessive forms, by language. These return just the
 * possessive *name* so the same grammar can be slotted into any phrase
 * ("… Diary", "… Year in Cats", "… Tagebuch") via a translation placeholder,
 * keeping the rule in one place.
 *
 * English grammar:
 * - Names ending in 's': "Marius'" (apostrophe only)
 * - Other names: "Dominique's" (apostrophe + s)
 *
 * German grammar:
 * - Names ending in 's': "Marius" (no genitive s)
 * - Other names: "Dominiques" (genitive s)
 */

export function possessiveEn(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

export function possessiveDe(name: string): string {
  return name.endsWith("s") ? name : `${name}s`;
}

/** The localised possessive name for the current locale. */
export function possessiveName(locale: string, name: string): string {
  return locale === "de" ? possessiveDe(name) : possessiveEn(name);
}

// Full diary titles, kept for callers that build the string directly (e.g. the
// profile page <title> metadata).
export function possessiveDiaryEn(name: string): string {
  return `${possessiveEn(name)} diary`;
}

export function possessiveDiaryDe(name: string): string {
  return `${possessiveDe(name)} Tagebuch`;
}

export function possessiveDiaryTitleEn(name: string): string {
  return `${possessiveEn(name)} Diary`;
}

export function possessiveDiaryTitleDe(name: string): string {
  return `${possessiveDe(name)} Tagebuch`;
}
