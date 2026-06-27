import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { CatForbiddenError, CatNotFoundError } from "@/lib/cats";
import { addVaccination, listVaccinations } from "@/lib/catCare";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  givenAt: z.string().trim().min(1),
  dueAt: z.string().trim().min(1).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const vaccinations = await listVaccinations(id, session?.user?.id ?? null);
  return NextResponse.json({ vaccinations });
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
    const vaccination = await addVaccination(id, userId, {
      name: parsed.data.name,
      givenAt: new Date(parsed.data.givenAt),
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      notes: parsed.data.notes ?? null,
    });
    return NextResponse.json({ vaccination }, { status: 201 });
  } catch (err) {
    if (err instanceof CatNotFoundError) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (err instanceof CatForbiddenError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    throw err;
  }
}
