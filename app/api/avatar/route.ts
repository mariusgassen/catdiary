import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { generateAvatarKey, processAndStoreAvatar, deleteObject } from "@/lib/storage";
import { db } from "@/lib/db";

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

  if (!ALLOWED_TYPES[file.type]) {
    return NextResponse.json({ error: "UNSUPPORTED_TYPE" }, { status: 400 });
  }

  const currentUser = await db.user.findUnique({ where: { id: userId }, select: { avatarKey: true } });

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const avatarKey = generateAvatarKey(userId);

  await processAndStoreAvatar(rawBuffer, avatarKey);
  await db.user.update({ where: { id: userId }, data: { avatarKey } });

  if (currentUser?.avatarKey) {
    await deleteObject(currentUser.avatarKey).catch(() => {});
  }

  return NextResponse.json({ avatarKey });
}

export async function DELETE() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    throw err;
  }

  const currentUser = await db.user.findUnique({ where: { id: userId }, select: { avatarKey: true } });

  await db.user.update({ where: { id: userId }, data: { avatarKey: null } });

  if (currentUser?.avatarKey) {
    await deleteObject(currentUser.avatarKey).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
