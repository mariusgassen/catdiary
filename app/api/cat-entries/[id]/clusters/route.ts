import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listJoinableClusters } from "@/lib/cats";

/** Ownerless ("shared") clusters the viewer could join this sighting to —
    scoped to nearby when geotagged, or searched by `q`. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const q = new URL(request.url).searchParams.get("q") ?? undefined;
  const clusters = await listJoinableClusters(id, session?.user?.id ?? null, q);
  return NextResponse.json({ clusters });
}
