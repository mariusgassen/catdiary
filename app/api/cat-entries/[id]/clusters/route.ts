import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listJoinableClusters, listJoinableOwnSightings } from "@/lib/cats";

/** Things the viewer could join this sighting to: ownerless ("shared") clusters
    and the viewer's own bare sightings — both scoped to nearby when geotagged,
    or searched by `q`. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const q = new URL(request.url).searchParams.get("q") ?? undefined;
  const [clusters, sightings] = await Promise.all([
    listJoinableClusters(id, viewerId, q),
    listJoinableOwnSightings(id, viewerId, q),
  ]);
  return NextResponse.json({ clusters, sightings });
}
