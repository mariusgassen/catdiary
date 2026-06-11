import { auth } from "@/lib/auth";
import { listCatEntriesForMap } from "@/lib/catEntries";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const entries = await listCatEntriesForMap(viewerId);
  return NextResponse.json(entries);
}
