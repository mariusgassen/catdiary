import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import {
  CatEntryForbiddenError,
  CatEntryNotFoundError,
  deleteCatEntry,
  getOwnedCatEntry,
  updateCatEntry,
} from "@/lib/catEntries";
import { deleteObject } from "@/lib/storage";

const updateSchema = z.object({
  name: z.string().max(120).nullable().optional(),
  breed: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
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

function mapCatEntryError(err: unknown) {
  if (err instanceof CatEntryNotFoundError) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (err instanceof CatEntryForbiddenError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  throw err;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await withOwner(async (userId) => {
    const entry = await getOwnedCatEntry(id, userId);
    if (!entry) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ entry });
  });
  return result.ok ? result.value : result.response;
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
      const entry = await updateCatEntry(id, userId, parsed.data);
      return NextResponse.json({ entry });
    } catch (err) {
      return mapCatEntryError(err);
    }
  });
  return result.ok ? result.value : result.response;
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await withOwner(async (userId) => {
    try {
      const entry = await deleteCatEntry(id, userId);
      await Promise.all([
        deleteObject(entry.photoKey).catch(() => {}),
        entry.thumbKey ? deleteObject(entry.thumbKey).catch(() => {}) : Promise.resolve(),
      ]);
      return NextResponse.json({ ok: true });
    } catch (err) {
      return mapCatEntryError(err);
    }
  });
  return result.ok ? result.value : result.response;
}
