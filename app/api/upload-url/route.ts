import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { generateObjectKey, processAndStoreThumbnail, uploadObject } from "@/lib/storage";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: "UNSUPPORTED_TYPE" }, { status: 400 });
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  // Apply EXIF orientation so stored originals have correct pixel orientation.
  const buffer = await sharp(rawBuffer).rotate().toBuffer();
  const key = generateObjectKey(userId, extension);

  const [thumbKey] = await Promise.all([
    processAndStoreThumbnail(buffer, key),
    uploadObject(key, buffer, file.type),
  ]);

  return NextResponse.json({ key, thumbKey });
}
