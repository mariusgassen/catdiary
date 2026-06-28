import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { CatForbiddenError, CatNotFoundError } from "@/lib/cats";
import { getCatCareRecord, updateCatCare, type UpdateCatCareInput } from "@/lib/catCare";

const updateSchema = z.object({
  microchipId: z.string().trim().max(60).nullable().optional(),
  neutered: z.boolean().nullable().optional(),
  birthday: z.string().trim().min(1).nullable().optional(), // ISO date string
  vetNotes: z.string().trim().max(2000).nullable().optional(),
  allergies: z.string().trim().max(1000).nullable().optional(),
  carePublic: z.boolean().optional(),
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
  const careRecord = await getCatCareRecord(id, session?.user?.id ?? null);
  if (!careRecord) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ careRecord });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await withOwner(async (userId) => {
    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 400 });
    }
    const { birthday, ...rest } = parsed.data;
    const input: UpdateCatCareInput = {
      ...rest,
      ...(birthday !== undefined ? { birthday: birthday ? new Date(birthday) : null } : {}),
    };
    try {
      await updateCatCare(id, userId, input);
      const careRecord = await getCatCareRecord(id, userId);
      return NextResponse.json({ careRecord });
    } catch (err) {
      return mapCatError(err);
    }
  });
  return result.ok ? result.value : result.response;
}
