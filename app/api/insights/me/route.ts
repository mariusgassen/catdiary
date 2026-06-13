import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { getDiaryInsights } from "@/lib/insights";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    throw err;
  }

  const insights = await getDiaryInsights(userId);
  return NextResponse.json(insights);
}
