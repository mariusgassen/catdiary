import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { generateObjectKey, getUploadUrl } from "@/lib/storage";

const requestSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  extension: z.enum(["jpg", "jpeg", "png", "webp"]),
});

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
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 400 });
  }

  const key = generateObjectKey(userId, parsed.data.extension);
  const uploadUrl = await getUploadUrl(key, parsed.data.contentType);

  return NextResponse.json({ key, uploadUrl });
}
