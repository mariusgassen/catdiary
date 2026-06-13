import { NextResponse } from "next/server";
import { ForbiddenError, requireAdminUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { getAdminInsights } from "@/lib/insights";

export async function GET() {
  try {
    await requireAdminUserId();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    throw err;
  }

  const insights = await getAdminInsights();
  return NextResponse.json(insights);
}
