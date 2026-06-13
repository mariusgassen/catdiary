import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import {
  CatEntryForbiddenError,
  CatEntryNotFoundError,
  deleteCatEntry,
  getCatEntryForViewer,
  updateCatEntry,
} from "@/lib/catEntries";
import { deleteObject } from "@/lib/storage";
import {
  FRAME_STYLES,
  FRAME_COLOR_KEYS,
  FRAME_TILT_MIN,
  FRAME_TILT_MAX,
  MAX_FRAME_CAPTION,
  MAX_FRAME_LABEL,
} from "@/lib/frames";

const updateSchema = z
  .object({
    name: z.string().max(120).nullable().optional(),
    breed: z.string().max(120).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    catId: z.string().nullable().optional(),
    frameStyle: z.enum(FRAME_STYLES).optional(),
    frameColor: z.enum(FRAME_COLOR_KEYS).nullable().optional(),
    framePaper: z.enum(FRAME_COLOR_KEYS).nullable().optional(),
    frameTilt: z.number().int().min(FRAME_TILT_MIN).max(FRAME_TILT_MAX).nullable().optional(),
    frameCaption: z.string().max(MAX_FRAME_CAPTION).nullable().optional(),
    frameLabel: z.string().max(MAX_FRAME_LABEL).nullable().optional(),
    locationName: z.string().max(200).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    // The date the cat was spotted; capped just past "now" for clock skew.
    createdAt: z.coerce
      .date()
      .max(new Date(Date.now() + 24 * 60 * 60 * 1000), "date cannot be in the future")
      .optional(),
  })
  .refine(
    (v) =>
      (v.latitude === undefined && v.longitude === undefined) ||
      (v.latitude !== undefined && v.longitude !== undefined && (v.latitude === null) === (v.longitude === null)),
    { message: "latitude and longitude must be updated together" },
  );

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
  const session = await auth();
  const entry = await getCatEntryForViewer(id, session?.user?.id ?? null);
  if (!entry) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ entry });
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
      await Promise.all(
        entry.photos.flatMap((photo) => [
          deleteObject(photo.photoKey).catch(() => {}),
          photo.thumbKey ? deleteObject(photo.thumbKey).catch(() => {}) : Promise.resolve(),
        ]),
      );
      return NextResponse.json({ ok: true });
    } catch (err) {
      return mapCatEntryError(err);
    }
  });
  return result.ok ? result.value : result.response;
}
