import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("FORBIDDEN");
  }
}

/** Resolves the current session's user id, or throws UnauthorizedError. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session.user.id;
}

/**
 * Resolves the current user id only if they're an admin. Throws
 * UnauthorizedError when signed out and ForbiddenError otherwise. The admin
 * flag is re-read from the database (not trusted from the session token) so a
 * revoked admin loses access immediately.
 */
export async function requireAdminUserId(): Promise<string> {
  const userId = await requireUserId();
  const user = await db.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (!user?.isAdmin) {
    throw new ForbiddenError();
  }
  return userId;
}
