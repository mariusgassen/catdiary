import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { CatForbiddenError, CatNotFoundError } from "@/lib/cats";
import { deleteVaccination } from "@/lib/catCare";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const { vid } = await params;

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
    await deleteVaccination(vid, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CatNotFoundError) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (err instanceof CatForbiddenError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    throw err;
  }
}
