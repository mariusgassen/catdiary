// The catalog of themed observational stamps a reader can leave on an entry.
// This is the single source of truth for the reaction set — shared by the
// schema-backed type, the API, and the render layer. Reactions are kept
// low-stakes and *observational*, not a like-race: a public entry only ever
// shows a single total count; the per-stamp breakdown is the owner's alone, and
// nothing ranks users or cats by reactions (see docs/feature-ideas.md).
//
// SAME_CAT is special — it's a re-identification *data signal* ("I think I've
// met this cat"), not applause. Kept free of JSX / server-only imports so it
// can be used anywhere.

export const REACTION_KINDS = [
  "PAW",
  "SPOTTED",
  "HANDSOME",
  "SAME_CAT",
  "SAFE",
] as const;

export type ReactionKind = (typeof REACTION_KINDS)[number];

// The plain paw — what a tap / double-tap leaves, and what every pre-reactions
// row reads as.
export const DEFAULT_REACTION_KIND: ReactionKind = "PAW";

/** Narrows any value (API input, stored string) to a known reaction, defaulting. */
export function asReactionKind(value: unknown): ReactionKind {
  return REACTION_KINDS.includes(value as ReactionKind)
    ? (value as ReactionKind)
    : DEFAULT_REACTION_KIND;
}

export type ReactionBreakdown = { kind: ReactionKind; count: number }[];
