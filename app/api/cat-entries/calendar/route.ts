import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCatCalendar } from "@/lib/catCalendar";

// GET /api/cat-entries/calendar?ownerId=<id>&year=<yyyy>
// Returns a suggested photo-calendar plan for one diary (defaults to next year).
// Visibility is enforced in the lib, so a diary the viewer can't see returns 404.
export async function GET(req: NextRequest) {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const ownerId = req.nextUrl.searchParams.get("ownerId");
  if (!ownerId) {
    return NextResponse.json({ error: "MISSING_OWNER" }, { status: 400 });
  }

  const yearParam = req.nextUrl.searchParams.get("year");
  let year: number | undefined;
  if (yearParam !== null) {
    const parsed = Number(yearParam);
    if (!Number.isInteger(parsed) || parsed < 1970 || parsed > 9999) {
      return NextResponse.json({ error: "INVALID_YEAR" }, { status: 400 });
    }
    year = parsed;
  }

  const data = await getCatCalendar(viewerId, ownerId, year);
  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(data);
}
