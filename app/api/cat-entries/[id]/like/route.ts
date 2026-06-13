import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { CatEntryForbiddenError, CatEntryNotFoundError } from "@/lib/catEntries";
import { setReaction } from "@/lib/likes";
import { asReactionKind, DEFAULT_REACTION_KIND } from "@/lib/reactions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    throw err;
  }

  // Body is optional: a bodyless POST leaves the default paw (back-compat).
  const body = await request.json().catch(() => null);
  const kind = body && typeof body === "object" ? asReactionKind((body as { kind?: unknown }).kind) : DEFAULT_REACTION_KIND;

  try {
    const result = await setReaction(userId, id, kind);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CatEntryNotFoundError) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (err instanceof CatEntryForbiddenError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    throw err;
  }
}
