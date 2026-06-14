import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { CatForbiddenError, CatLinkTooFarError, CatNotFoundError, requestCatLink } from "@/lib/cats";

const linkSchema = z
  .object({
    catId: z.string().min(1).optional(),
    targetEntryId: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.catId) !== Boolean(v.targetEntryId), {
    message: "provide exactly one of catId or targetEntryId",
  });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let requesterId: string;
  try {
    requesterId = await requireUserId();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    throw err;
  }

  const body = await request.json().catch(() => null);
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await requestCatLink({
      entryId: id,
      catId: parsed.data.catId,
      targetEntryId: parsed.data.targetEntryId,
      requesterId,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CatNotFoundError) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (err instanceof CatLinkTooFarError) return NextResponse.json({ error: "TOO_FAR" }, { status: 422 });
    if (err instanceof CatForbiddenError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    throw err;
  }
}
