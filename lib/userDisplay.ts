/**
 * The name to render for a user anywhere in the UI: their chosen display
 * name, falling back to their username (handle) when no display name is set.
 * Pure function so it's usable from client components too.
 */
export function displayNameFor(user: { displayName: string | null; username?: string | null }): string {
  return user.displayName || user.username || "Anonymous";
}
