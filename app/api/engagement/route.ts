import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { recordEngagement, MAX_ENGAGEMENT_EVENTS, type EngagementEvent } from "@/lib/engagement";

// Passive engagement is best-effort telemetry sent via `navigator.sendBeacon`
// (which ignores the response) or `fetch(..., { keepalive: true })`. So we
// always answer 204 — even when signed out or given junk — rather than surface
// errors a client can't act on. The body is read as text because beacons don't
// set a JSON content-type.
export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof UnauthorizedError) return new NextResponse(null, { status: 204 });
    throw err;
  }

  let events: EngagementEvent[] = [];
  try {
    const parsed = JSON.parse(await request.text()) as { events?: unknown };
    if (Array.isArray(parsed.events)) {
      events = parsed.events.slice(0, MAX_ENGAGEMENT_EVENTS) as EngagementEvent[];
    }
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  await recordEngagement(userId, events);
  return new NextResponse(null, { status: 204 });
}
