import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { followUser, unfollowUser } from "@/lib/follows";

const bodySchema = z.object({ followeeId: z.string().min(1) });

async function withSession<T>(fn: (userId: string) => Promise<T>) {
  try {
    const userId = await requireUserId();
    return { ok: true as const, value: await fn(userId) };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { ok: false as const, response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
    }
    throw err;
  }
}

export async function POST(request: Request) {
  const result = await withSession(async (userId) => {
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }

    try {
      const follow = await followUser(userId, parsed.data.followeeId);
      return NextResponse.json({ follow }, { status: 201 });
    } catch (err) {
      if (err instanceof Error && (err.message === "USER_NOT_FOUND" || err.message === "CANNOT_FOLLOW_SELF")) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  });

  return result.ok ? result.value : result.response;
}

export async function DELETE(request: Request) {
  const result = await withSession(async (userId) => {
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }

    await unfollowUser(userId, parsed.data.followeeId);
    return NextResponse.json({ ok: true });
  });

  return result.ok ? result.value : result.response;
}
