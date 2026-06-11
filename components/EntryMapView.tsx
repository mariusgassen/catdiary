"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type LType from "leaflet";

export default function EntryMapView({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    async function init() {
      const L = (await import("leaflet")).default;
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      }).setView([lat, lng], 15);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="width:36px;height:36px;border-radius:50%;border:3px solid #3b6fe0;box-shadow:0 2px 8px rgba(0,0,0,.3);background:#3b6fe0;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;">🐾</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker([lat, lng], { icon }).addTo(map);
    }

    init().catch(console.error);
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // lat/lng are stable for a given entry; re-running would flash the map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
