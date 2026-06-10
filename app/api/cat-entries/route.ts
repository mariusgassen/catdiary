import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createCatEntry, listCatEntriesForViewer } from "@/lib/catEntries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

const createSchema = z.object({
  photoKey: z.string().min(1),
  thumbKey: z.string().min(1).optional(),
  name: z.string().max(120).optional(),
  breed: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);

  const result = await listCatEntriesForViewer({
    viewerId: session?.user?.id ?? null,
    ownerId: searchParams.get("ownerId") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    query: searchParams.get("q") ?? undefined,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  let ownerId: string;
  try {
    ownerId = await requireUserId();
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

  const entry = await createCatEntry({ ownerId, ...parsed.data });
  return NextResponse.json({ entry }, { status: 201 });
}
