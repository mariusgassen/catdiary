"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

const EntryMapView = dynamic(() => import("@/components/EntryMapView"), { ssr: false });

export function EntryMap({
  lat,
  lng,
  locationName,
}: {
  lat: number;
  lng: number;
  locationName?: string | null;
}) {
  return (
    <div className="mx-3 rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
      <div className="relative h-44">
        <EntryMapView lat={lat} lng={lng} />
        {locationName && (
          <div className="absolute bottom-2 left-2 z-[1000] flex items-center gap-1.5 rounded-lg bg-surface/90 px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm pointer-events-none">
            <MapPin size={11} className="text-accent shrink-0" />
            <span className="truncate max-w-[180px]">{locationName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
