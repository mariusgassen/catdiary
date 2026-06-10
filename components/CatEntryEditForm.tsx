"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LocationPicker, type PickedLocation } from "@/components/LocationPicker";

type CatEntryEditFormProps = {
  entry: {
    id: string;
    name: string | null;
    breed: string | null;
    notes: string | null;
    locationName: string | null;
    latitude: number | null;
    longitude: number | null;
  };
};

export function CatEntryEditForm({ entry }: CatEntryEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(entry.name ?? "");
  const [breed, setBreed] = useState(entry.breed ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");
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

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-md flex-col gap-3">
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
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        maxLength={2000}
        className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-muted"
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
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || deleting}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/30 transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting || deleting}
          className="rounded-xl border border-red-600 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete entry"}
        </button>
      </div>
    </form>
  );
}
