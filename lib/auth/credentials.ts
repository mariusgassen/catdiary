import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const SALT_ROUNDS = 12;

// Lowercase letters, digits, dot/underscore — 3-30 chars, must start alphanumeric.
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]{2,29}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createUserWithPassword(input: {
  email: string;
  username: string;
  password: string;
  displayName: string | null;
}) {
  const username = normalizeUsername(input.username);
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("INVALID_USERNAME");
  }

  const [emailTaken, usernameTaken] = await Promise.all([
    db.user.findUnique({ where: { email: input.email } }),
    db.user.findUnique({ where: { username } }),
  ]);
  if (emailTaken) throw new Error("EMAIL_TAKEN");
  if (usernameTaken) throw new Error("USERNAME_TAKEN");

  const passwordHash = await hashPassword(input.password);
  const user = await db.user.create({
    data: {
      email: input.email,
      username,
      passwordHash,
      displayName: input.displayName,
    },
  });

  return { id: user.id, email: user.email, username: user.username, displayName: user.displayName };
}

/** `identifier` may be either the account email or the username. */
export async function verifyCredentials(input: { identifier: string; password: string }) {
  const identifier = input.identifier.trim();
  const user = identifier.includes("@")
    ? await db.user.findUnique({ where: { email: identifier } })
    : await db.user.findUnique({ where: { username: normalizeUsername(identifier) } });

  if (!user || !user.passwordHash) {
    return null;
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    return null;
  }

  return { id: user.id, email: user.email, name: user.displayName ?? user.username, image: user.image };
}
