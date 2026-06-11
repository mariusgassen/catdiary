"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type LType from "leaflet";
import type { MapEntry } from "@/lib/catEntries";

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let map: LType.Map | null = null;

    async function init() {
      const L = (await import("leaflet")).default;
      if (!containerRef.current || mapRef.current) return;

      map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([20, 0], 2);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      let entries: MapEntry[] = [];
      try {
        const res = await fetch("/api/cat-entries/map");
        entries = await res.json();
      } finally {
        setLoading(false);
      }

      if (entries.length === 0) {
        setIsEmpty(true);
        return;
      }

      const bounds: [number, number][] = [];

      entries.forEach((entry) => {
        const thumbUrl = entry.thumbKey ? `/api/photos/${entry.thumbKey}` : null;

        const markerHtml = thumbUrl
          ? `<div style="width:44px;height:44px;border-radius:50%;overflow:hidden;border:3px solid #3b6fe0;box-shadow:0 2px 8px rgba(0,0,0,.3);background:#fff;cursor:pointer;"><img src="${thumbUrl}" style="width:100%;height:100%;object-fit:cover" /></div>`
          : `<div style="width:44px;height:44px;border-radius:50%;border:3px solid #3b6fe0;box-shadow:0 2px 8px rgba(0,0,0,.3);background:#3b6fe0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;line-height:1;">🐾</div>`;

        const icon = L.divIcon({
          className: "",
          html: markerHtml,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          popupAnchor: [0, -26],
        });

        const popupHtml = `
          <div style="font-family:system-ui,sans-serif;min-width:140px;text-align:center;padding:4px 2px">
            ${thumbUrl ? `<img src="${thumbUrl}" style="width:100px;height:100px;object-fit:cover;border-radius:6px;display:block;margin:0 auto 8px" />` : ""}
            <div style="font-weight:600;font-size:14px;color:#292524">${entry.name ?? "Unknown cat"}</div>
            ${entry.breed ? `<div style="font-size:12px;color:#79716b;margin-top:2px">${entry.breed}</div>` : ""}
            ${entry.locationName ? `<div style="font-size:11px;color:#79716b;margin-top:3px">📍 ${entry.locationName}</div>` : ""}
            <a href="/cat-entries/${entry.id}" style="display:inline-block;margin-top:8px;padding:5px 12px;background:#3b6fe0;color:#fff;border-radius:6px;font-size:12px;font-weight:500;text-decoration:none;">See entry →</a>
          </div>`;

        if (map) {
          L.marker([entry.latitude, entry.longitude], { icon })
            .bindPopup(popupHtml, { maxWidth: 200 })
            .addTo(map);
        }

        bounds.push([entry.latitude, entry.longitude]);
      });

      if (map && bounds.length > 0) {
        if (bounds.length === 1) {
          map.setView(bounds[0], 13);
        } else {
          map.fitBounds(bounds as LType.LatLngBoundsExpression, { padding: [40, 40] });
        }
      }
    }

    init().catch(console.error);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-[1000]">
          <span className="text-muted text-sm">Loading map…</span>
        </div>
      )}

      {!loading && isEmpty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8 z-[1000] pointer-events-none">
          <span className="text-5xl">🐾</span>
          <p className="text-sm text-muted max-w-xs leading-relaxed">
            No sightings with location data yet. Add a location when logging a cat to pin it on the map.
          </p>
        </div>
      )}
    </div>
  );
}
