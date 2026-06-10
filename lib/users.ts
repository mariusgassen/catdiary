import { db } from "@/lib/db";
import { normalizeUsername, USERNAME_PATTERN } from "@/lib/auth/credentials";

export async function getUserSettings(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bio: true,
      isPrivate: true,
    },
  });
}

/**
 * Find people by handle or display name for the Discover screen. Private
 * users are listed too (profiles are linkable either way); their diaries
 * stay protected by the entry-visibility checks.
 */
export async function searchUsers(query: string, limit = 12) {
  const q = query.trim().replace(/^@/, "");
  if (!q) return [];

  return db.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarKey: true,
      image: true,
      isPrivate: true,
      _count: { select: { catEntries: true } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export type UpdateUserSettingsInput = {
  displayName?: string | null; // null clears it; the username becomes the displayed name
  username?: string;
  bio?: string | null;
  isPrivate?: boolean;
};

export async function updateUserSettings(userId: string, input: UpdateUserSettingsInput) {
  const data = { ...input };

  // Changing the handle follows the same rules as picking one at registration.
  if (input.username !== undefined) {
    const username = normalizeUsername(input.username);
    if (!USERNAME_PATTERN.test(username)) {
      throw new Error("INVALID_USERNAME");
    }
    const taken = await db.user.findUnique({ where: { username }, select: { id: true } });
    if (taken && taken.id !== userId) {
      throw new Error("USERNAME_TAKEN");
    }
    data.username = username;
  }

  return db.user.update({
    where: { id: userId },
    data,
    select: { id: true, username: true, displayName: true, bio: true, isPrivate: true },
  });
}
