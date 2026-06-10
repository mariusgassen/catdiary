import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { getOrCreateInviteCode } from "@/lib/invites";

/** Returns the caller's personal invite code, generating it on first use. */
export async function POST() {
  try {
    const userId = await requireUserId();
    const code = await getOrCreateInviteCode(userId);
    return NextResponse.json({ code });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    throw err;
  }
}
