"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type CatEntryEditFormProps = {
  entry: {
    id: string;
    name: string | null;
    breed: string | null;
    notes: string | null;
    latitude: number;
    longitude: number;
  };
};

export function CatEntryEditForm({ entry }: CatEntryEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(entry.name ?? "");
  const [breed, setBreed] = useState(entry.breed ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [latitude, setLatitude] = useState(String(entry.latitude));
  const [longitude, setLongitude] = useState(String(entry.longitude));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("A valid location is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/cat-entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || null,
          breed: breed || null,
          notes: notes || null,
          latitude: lat,
          longitude: lng,
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
        className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
      />
      <input
        placeholder="Breed / color (optional)"
        value={breed}
        onChange={(e) => setBreed(e.target.value)}
        className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
      />
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
        rows={3}
      />
      <div className="flex gap-3">
        <input
          required
          placeholder="Latitude"
          inputMode="decimal"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          className="w-1/2 rounded border border-black/15 px-3 py-2 dark:border-white/20"
        />
        <input
          required
          placeholder="Longitude"
          inputMode="decimal"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          className="w-1/2 rounded border border-black/15 px-3 py-2 dark:border-white/20"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || deleting}
          className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting || deleting}
          className="rounded border border-red-600 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete entry"}
        </button>
      </div>
    </form>
  );
}
