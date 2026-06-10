import { randomInt } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// Unambiguous lowercase alphabet (no i/l/o/0/1) — codes end up in links people
// occasionally read out loud or retype.
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const CODE_LENGTH = 12;

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * The user's personal invite code, generated on first use and stable after
 * that — the same link can be shared any number of times.
 */
export async function getOrCreateInviteCode(userId: string): Promise<string> {
  // Conditional update instead of read-then-write so concurrent calls can't
  // overwrite a code that was already handed out. Retried in case the fresh
  // code collides with an existing one (P2002, astronomically unlikely).
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.user.updateMany({
        where: { id: userId, inviteCode: null },
        data: { inviteCode: generateInviteCode() },
      });
      break;
    } catch (err) {
      const isUniqueViolation =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueViolation || attempt === 2) throw err;
    }
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { inviteCode: true },
  });
  if (!user?.inviteCode) {
    throw new Error("USER_NOT_FOUND");
  }
  return user.inviteCode;
}

/** The public profile bits the invite landing page shows for a code, or null. */
export async function getInviterByCode(code: string) {
  if (!code) return null;
  return db.user.findUnique({
    where: { inviteCode: code },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      image: true,
      isPrivate: true,
      _count: { select: { catEntries: true } },
    },
  });
}

/**
 * Links a freshly registered user to their inviter and starts them following
 * the inviter's diary. Being invited implies approval, so the follow is
 * approved even when the inviter's diary is private. Stale or invalid codes
 * are ignored — registration must never fail because a shared link went bad.
 */
export async function redeemInviteCode(code: string, newUserId: string): Promise<void> {
  const inviter = await db.user.findUnique({
    where: { inviteCode: code },
    select: { id: true },
  });
  if (!inviter || inviter.id === newUserId) return;

  await db.$transaction([
    db.user.update({
      where: { id: newUserId },
      data: { invitedById: inviter.id },
    }),
    db.follow.upsert({
      where: { followerId_followeeId: { followerId: newUserId, followeeId: inviter.id } },
      update: { approved: true },
      create: { followerId: newUserId, followeeId: inviter.id, approved: true },
    }),
  ]);
}
