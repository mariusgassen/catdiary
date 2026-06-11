import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { savePushSubscription, deletePushSubscription, VAPID_PUBLIC_KEY } from "@/lib/webpush";

export async function GET() {
  return NextResponse.json({ vapidPublicKey: VAPID_PUBLIC_KEY ?? null });
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => null);
    if (
      !body?.endpoint ||
      typeof body.endpoint !== "string" ||
      !body.keys?.p256dh ||
      !body.keys?.auth
    ) {
      return NextResponse.json({ error: "INVALID_SUBSCRIPTION" }, { status: 400 });
    }
    await savePushSubscription(userId, {
      endpoint: body.endpoint,
      keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    throw err;
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => null);
    if (!body?.endpoint || typeof body.endpoint !== "string") {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }
    await deletePushSubscription(userId, body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    throw err;
  }
}
