import { db } from "@/lib/db";

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

export type UpdateUserSettingsInput = {
  displayName?: string;
  bio?: string | null;
  isPrivate?: boolean;
};

export async function updateUserSettings(userId: string, input: UpdateUserSettingsInput) {
  return db.user.update({
    where: { id: userId },
    data: input,
    select: { id: true, displayName: true, bio: true, isPrivate: true },
  });
}
