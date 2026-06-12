"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { LocationPicker, type PickedLocation } from "@/components/LocationPicker";
import { CaptionInput } from "@/components/CaptionInput";
import { FramePicker } from "@/components/FramePicker";
import { asFrameStyle, type FrameStyle } from "@/lib/frames";

type CatEntryEditFormProps = {
  entry: {
    id: string;
    name: string | null;
    breed: string | null;
    notes: string | null;
    locationName: string | null;
    latitude: number | null;
    longitude: number | null;
    frameStyle?: string | null;
  };
  coverUrl?: string | null;
};

/*
 * Mobile-style edit screen: a top bar with Cancel on the left and Save on the
 * right (like a native modal sheet), the fields below, and Delete demoted to
 * a destructive action at the very bottom — backing out is always one tap.
 */
export function CatEntryEditForm({ entry, coverUrl }: CatEntryEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(entry.name ?? "");
  const [breed, setBreed] = useState(entry.breed ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [frameStyle, setFrameStyle] = useState<FrameStyle>(asFrameStyle(entry.frameStyle));
  const [location, setLocation] = useState<PickedLocation | null>(
    entry.latitude != null && entry.longitude != null
      ? { name: entry.locationName ?? "Pinned on the map", lat: entry.latitude, lng: entry.longitude }
      : null
  );
  const [geoDisabled, setGeoDisabled] = useState(entry.latitude == null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleCancel() {
    router.back();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!location && !geoDisabled) {
      setError("Pick a location or switch location off.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/cat-entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          breed: breed.trim() || null,
          notes: notes.trim() || null,
          frameStyle,
          locationName: location?.name ?? null,
          latitude: location?.lat ?? null,
          longitude: location?.lng ?? null,
        }),
      });
      if (!res.ok) {
        setError("Could not save the changes.");
        return;
      }

      router.back();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this cat entry? This can't be undone.")) return;

    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/cat-entries/${entry.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Could not delete the entry.");
        return;
      }
      router.push("/feed");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const busy = submitting || deleting;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-dvh flex-col">
      {/* Top navigation: Cancel · title · Save */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-[480px] items-center justify-between px-1">
          <button
            type="button"
            onClick={handleCancel}
            disabled={busy}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            <X size={16} aria-hidden />
            Cancel
          </button>
          <h1 className="text-sm font-semibold">Edit entry</h1>
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-accent disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" aria-hidden />}
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-4">
        <input
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-muted"
        />
        <input
          placeholder="Breed / color (optional)"
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          maxLength={120}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-muted"
        />
        <CaptionInput
          value={notes}
          onChange={setNotes}
          placeholder="Notes (optional) — #tags and @mentions"
          rows={3}
        />
        <FramePicker
          value={frameStyle}
          onChange={setFrameStyle}
          sampleUrl={coverUrl}
          name={name.trim() || null}
          breed={breed.trim() || null}
          locationName={location?.name ?? null}
        />
        <LocationPicker
          location={location}
          setLocation={setLocation}
          geoDisabled={geoDisabled}
          setGeoDisabled={setGeoDisabled}
          isLocating={isLocating}
          setIsLocating={setIsLocating}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Destructive action, tucked at the bottom of the sheet */}
        <div className="mt-auto flex justify-center border-t border-dashed border-border pt-4 pb-6">
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-600/10 disabled:opacity-50"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Trash2 size={14} aria-hidden />}
            {deleting ? "Deleting…" : "Delete this entry"}
          </button>
        </div>
      </div>
    </form>
  );
}
