import { MapClient } from "@/components/MapClient";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ lat?: string; lng?: string }>;
}) {
  const { lat, lng } = await searchParams;
  const initialLat = lat ? parseFloat(lat) : undefined;
  const initialLng = lng ? parseFloat(lng) : undefined;

  return (
    <main
      className="w-full"
      style={{ height: "calc(100dvh - 3.5rem - env(safe-area-inset-bottom, 0px))" }}
    >
      <MapClient initialLat={initialLat} initialLng={initialLng} />
    </main>
  );
}
