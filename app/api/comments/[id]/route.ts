import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { CatEntryForbiddenError } from "@/lib/catEntries";
import { CommentNotFoundError, deleteComment } from "@/lib/comments";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  try {
    await deleteComment(id, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CommentNotFoundError) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (err instanceof CatEntryForbiddenError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    throw err;
  }
}
