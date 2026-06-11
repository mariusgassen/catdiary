"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export function MapClient({
  initialLat,
  initialLng,
}: {
  initialLat?: number;
  initialLng?: number;
}) {
  return <MapView initialLat={initialLat} initialLng={initialLng} />;
}
