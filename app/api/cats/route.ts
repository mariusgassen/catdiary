import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { createCat, listCatsForProfile } from "@/lib/cats";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  breed: z.string().trim().max(120).nullable().optional(),
  color: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  // `ownerId` lists a given diary's cats; omitting it returns the signed-in
  // user's cats — the ones they've claimed plus ownerless clusters their
  // sightings belong to (used by the capture/edit cat pickers).
  const ownerId = new URL(request.url).searchParams.get("ownerId") ?? viewerId;
  if (!ownerId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const cats = await listCatsForProfile(ownerId, viewerId);
  return NextResponse.json({ cats });
}

export async function POST(request: Request) {
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

  const cat = await createCat({ ownerId: userId, ...parsed.data });
  return NextResponse.json({ cat }, { status: 201 });
}
