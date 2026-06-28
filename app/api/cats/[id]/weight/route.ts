import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { CatForbiddenError, CatNotFoundError } from "@/lib/cats";
import { addWeightEntry, listWeightEntries } from "@/lib/catCare";

const createSchema = z.object({
  weightKg: z.number().positive().max(50),
  measuredAt: z.string().trim().min(1),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const weightEntries = await listWeightEntries(id, session?.user?.id ?? null);
  return NextResponse.json({ weightEntries });
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
    const weightEntry = await addWeightEntry(id, userId, {
      weightKg: parsed.data.weightKg,
      measuredAt: new Date(parsed.data.measuredAt),
      notes: parsed.data.notes ?? null,
    });
    return NextResponse.json({ weightEntry }, { status: 201 });
  } catch (err) {
    if (err instanceof CatNotFoundError) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (err instanceof CatForbiddenError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    throw err;
  }
}
