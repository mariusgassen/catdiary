import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { listNotifications, markNotificationsRead, getUnreadCount } from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") ?? undefined;
    const unreadOnly = searchParams.get("unread") === "1";

    if (unreadOnly) {
      const count = await getUnreadCount(userId);
      return NextResponse.json({ count });
    }

    const notifications = await listNotifications(userId, 30, cursor);
    const nextCursor = notifications.length === 30 ? notifications[notifications.length - 1].createdAt.toISOString() : null;
    return NextResponse.json({ notifications, nextCursor });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    throw err;
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => ({}));
    const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;
    await markNotificationsRead(userId, ids);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    throw err;
  }
}
