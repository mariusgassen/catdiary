import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { CatEntryForbiddenError, CatEntryNotFoundError } from "@/lib/catEntries";
import { addComment, listComments } from "@/lib/comments";

const createSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});

function mapError(err: unknown) {
  if (err instanceof CatEntryNotFoundError) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (err instanceof CatEntryForbiddenError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  throw err;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  try {
    const comments = await listComments(id, session?.user?.id ?? null);
    return NextResponse.json({ comments });
  } catch (err) {
    return mapError(err);
  }
}

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

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const comment = await addComment(userId, id, parsed.data.body);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    return mapError(err);
  }
}
