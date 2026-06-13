import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import {
  CatForbiddenError,
  CatNotFoundError,
  deleteCat,
  getCatForViewer,
  updateCat,
} from "@/lib/cats";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  breed: z.string().trim().max(120).nullable().optional(),
  color: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  isOwned: z.boolean().optional(),
});

async function withOwner<T>(fn: (userId: string) => Promise<T>) {
  try {
    return { ok: true as const, value: await fn(await requireUserId()) };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { ok: false as const, response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
    }
    throw err;
  }
}

function mapCatError(err: unknown) {
  if (err instanceof CatNotFoundError) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (err instanceof CatForbiddenError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  throw err;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const cat = await getCatForViewer(id, session?.user?.id ?? null);
  if (!cat) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ cat });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await withOwner(async (userId) => {
    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 400 });
    }
    try {
      const cat = await updateCat(id, userId, parsed.data);
      return NextResponse.json({ cat });
    } catch (err) {
      return mapCatError(err);
    }
  });
  return result.ok ? result.value : result.response;
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await withOwner(async (userId) => {
    try {
      await deleteCat(id, userId);
      return NextResponse.json({ ok: true });
    } catch (err) {
      return mapCatError(err);
    }
  });
  return result.ok ? result.value : result.response;
}
