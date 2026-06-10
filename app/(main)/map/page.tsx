import { Map } from "lucide-react";

export default function MapPage() {
  return (
    <div className="paper-grid flex min-h-dvh flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <Map size={36} className="text-accent" aria-hidden />
      <h1 className="font-display text-xl font-semibold">The expedition map</h1>
      <p className="max-w-xs font-display text-sm italic text-muted">
        Every sighting, pinned where it happened — coming soon.
      </p>
    </div>
  );
}
