import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listNearbyCatEntries } from "@/lib/catEntries";
import { photoUrlsFor } from "@/lib/photo-urls";

export async function GET(request: Request) {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radius = Math.min(parseFloat(searchParams.get("radius") ?? "5"), 50);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "invalid coordinates" }, { status: 400 });
  }

  const entries = await listNearbyCatEntries({ lat, lng, radiusKm: radius, viewerId });

  return NextResponse.json({
    entries: entries.map((e) => ({
      ...e,
      photoUrls: photoUrlsFor(e.photos),
    })),
  });
}
