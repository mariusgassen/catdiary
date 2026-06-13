import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { suggestCatsForEntry } from "@/lib/cats";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const suggestions = await suggestCatsForEntry(id, session?.user?.id ?? null);
  return NextResponse.json({ suggestions });
}
