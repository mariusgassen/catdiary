import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { getUserSettings, updateUserSettings } from "@/lib/users";

const updateSchema = z.object({
  // Clearing the display name (null/empty) is allowed — the username takes over.
  displayName: z
    .union([z.string().trim().max(80), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null)),
  username: z.string().min(1).optional(), // format/uniqueness enforced in lib/users
  bio: z.string().trim().max(500).nullable().optional(),
  isPrivate: z.boolean().optional(),
});

async function withUser<T>(fn: (userId: string) => Promise<T>) {
  try {
    return { ok: true as const, value: await fn(await requireUserId()) };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { ok: false as const, response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
    }
    throw err;
  }
}

export async function GET() {
  const result = await withUser(async (userId) => {
    const user = await getUserSettings(userId);
    return NextResponse.json({ user });
  });
  return result.ok ? result.value : result.response;
}

export async function PATCH(request: Request) {
  const result = await withUser(async (userId) => {
    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 400 });
    }
    try {
      const user = await updateUserSettings(userId, parsed.data);
      return NextResponse.json({ user });
    } catch (err) {
      if (err instanceof Error && err.message === "INVALID_USERNAME") {
        return NextResponse.json({ error: "INVALID_USERNAME" }, { status: 400 });
      }
      if (err instanceof Error && err.message === "USERNAME_TAKEN") {
        return NextResponse.json({ error: "USERNAME_TAKEN" }, { status: 409 });
      }
      throw err;
    }
  });
  return result.ok ? result.value : result.response;
}
