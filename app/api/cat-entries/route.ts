import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  createCatEntry,
  listCatEntriesForViewer,
  storeCatEntryEmbedding,
  MAX_PHOTOS_PER_ENTRY,
} from "@/lib/catEntries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { getObject } from "@/lib/storage";
import {
  FRAME_STYLES,
  FRAME_COLOR_KEYS,
  FRAME_TILT_MIN,
  FRAME_TILT_MAX,
  MAX_FRAME_CAPTION,
  MAX_FRAME_LABEL,
} from "@/lib/frames";

async function embedInBackground(entryId: string, photoKey: string) {
  try {
    const obj = await getObject(photoKey);
    const buffer = Buffer.from(await obj.Body!.transformToByteArray());
    const { getImageEmbedding } = await import("@/lib/embeddings");
    const embedding = await getImageEmbedding(buffer);
    await storeCatEntryEmbedding(entryId, embedding);
  } catch (err) {
    console.error("[embeddings] failed for entry", entryId, err);
  }
}

const createSchema = z
  .object({
    photos: z
      .array(
        z.object({
          photoKey: z.string().min(1),
          thumbKey: z.string().min(1).optional(),
        }),
      )
      .min(1)
      .max(MAX_PHOTOS_PER_ENTRY),
    name: z.string().max(120).optional(),
    breed: z.string().max(120).optional(),
    notes: z.string().max(2000).optional(),
    catId: z.string().min(1).optional(),
    frameStyle: z.enum(FRAME_STYLES).optional(),
    frameColor: z.enum(FRAME_COLOR_KEYS).nullish(),
    framePaper: z.enum(FRAME_COLOR_KEYS).nullish(),
    frameTilt: z.number().int().min(FRAME_TILT_MIN).max(FRAME_TILT_MAX).nullish(),
    frameCaption: z.string().max(MAX_FRAME_CAPTION).nullish(),
    frameLabel: z.string().max(MAX_FRAME_LABEL).nullish(),
    locationName: z.string().max(200).nullish(),
    // Both null/absent when the user disabled geo data for this entry.
    latitude: z.number().min(-90).max(90).nullish(),
    longitude: z.number().min(-180).max(180).nullish(),
    // When the cat was spotted; from photo EXIF or user-edited. Absent = now.
    // Capped just past "now" to tolerate clock skew without far-future entries.
    createdAt: z.coerce
      .date()
      .max(new Date(Date.now() + 24 * 60 * 60 * 1000), "date cannot be in the future")
      .optional(),
  })
  .refine((v) => (v.latitude == null) === (v.longitude == null), {
    message: "latitude and longitude must be provided together",
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

  // Generate and store embedding in background — does not block the response.
  // The cover photo (first one) represents the entry.
  embedInBackground(entry.id, parsed.data.photos[0].photoKey);

  return NextResponse.json({ entry }, { status: 201 });
}
