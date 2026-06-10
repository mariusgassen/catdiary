"use client";

import { useRef, useState } from "react";
import { MapPin, MapPinOff, Locate, Search, X, Loader2 } from "lucide-react";

export type PickedLocation = {
  name: string;
  lat: number;
  lng: number;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
};

function shortLocationName(result: NominatimResult): string {
  const a = result.address ?? {};
  return (
    a.city || a.town || a.village || a.suburb || a.county ||
    result.display_name.split(",")[0]
  );
}

/** Resolves a human-readable place name for coordinates (falls back to rounded coords). */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data: NominatimResult = await res.json();
    return shortLocationName(data);
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

/**
 * Location field for entry forms. The user always works with a place name —
 * never raw coordinates — sourced from the photo, their device, or a search.
 * They can also switch geo data off entirely for the entry.
 */
export function LocationPicker({
  location,
  setLocation,
  geoDisabled,
  setGeoDisabled,
  isLocating,
  setIsLocating,
}: {
  location: PickedLocation | null;
  setLocation: (l: PickedLocation | null) => void;
  geoDisabled: boolean;
  setGeoDisabled: (v: boolean) => void;
  isLocating: boolean;
  setIsLocating: (v: boolean) => void;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function doSearch(q: string) {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      setResults(await res.json());
    } finally {
      setSearching(false);
    }
  }

  function onQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(e.target.value), 500);
  }

  function pick(result: NominatimResult) {
    setGeoDisabled(false);
    setLocation({
      name: shortLocationName(result),
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    });
    setShowSearch(false);
    setQuery("");
    setResults([]);
  }

  function locateMe() {
    setGeoDisabled(false);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const name = await reverseGeocode(latitude, longitude);
        setLocation({ name, lat: latitude, lng: longitude });
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  if (showSearch) {
    return (
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <Search size={16} className="text-muted shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={onQueryChange}
            placeholder="Search for a place…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          {searching && <Loader2 size={14} className="animate-spin text-muted shrink-0" />}
          <button onClick={() => setShowSearch(false)} className="p-1 -m-1 text-muted">
            <X size={16} />
          </button>
        </div>
        {results.length > 0 && (
          <ul>
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  onClick={() => pick(r)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent-soft active:bg-accent-soft transition-colors border-b border-border last:border-0"
                >
                  <span className="font-medium">{shortLocationName(r)}</span>
                  <span className="block text-xs text-muted truncate">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query && !searching && results.length === 0 && (
          <p className="px-3 py-3 text-sm text-muted">No places found</p>
        )}
      </div>
    );
  }

  if (geoDisabled) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-3 py-2.5">
        <MapPinOff size={16} className="text-muted shrink-0" />
        <span className="flex-1 text-sm text-muted">Location off — nothing is shared</span>
        <button
          onClick={locateMe}
          className="text-xs font-medium text-accent hover:underline"
        >
          Turn on
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
      <MapPin size={16} className="text-accent shrink-0" />
      <span className="flex-1 text-sm truncate">
        {isLocating ? "Finding where you are…" : location?.name || "No location set"}
      </span>
      <button
        onClick={() => setShowSearch(true)}
        className="p-1.5 text-muted hover:text-foreground transition-colors"
        aria-label="Search location"
      >
        <Search size={16} />
      </button>
      <button
        onClick={locateMe}
        disabled={isLocating}
        className="p-1.5 text-muted hover:text-foreground transition-colors disabled:opacity-50"
        aria-label="Use my location"
      >
        {isLocating ? <Loader2 size={16} className="animate-spin" /> : <Locate size={16} />}
      </button>
      <button
        onClick={() => {
          setLocation(null);
          setGeoDisabled(true);
        }}
        className="p-1.5 -mr-1 text-muted hover:text-foreground transition-colors"
        aria-label="Turn location off"
      >
        <MapPinOff size={16} />
      </button>
    </div>
  );
}
