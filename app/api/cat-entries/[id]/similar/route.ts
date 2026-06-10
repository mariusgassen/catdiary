import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSimilarCatEntries } from "@/lib/catEntries";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const entries = await getSimilarCatEntries(id, viewerId);
  return NextResponse.json({ entries });
}
