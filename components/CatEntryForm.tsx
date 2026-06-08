"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const EXTENSION_BY_TYPE: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function CatEntryForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!file || Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("A photo and a valid location are required.");
      return;
    }

    const extension = EXTENSION_BY_TYPE[file.type];
    if (!extension) {
      setError("Photo must be a JPEG, PNG, or WebP image.");
      return;
    }

    setSubmitting(true);
    try {
      const presign = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, extension }),
      });
      if (!presign.ok) {
        setError("Could not prepare the upload.");
        return;
      }
      const { key, uploadUrl } = await presign.json();

      const upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!upload.ok) {
        setError("Photo upload failed.");
        return;
      }

      const create = await fetch("/api/cat-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoKey: key,
          name: name || undefined,
          breed: breed || undefined,
          notes: notes || undefined,
          latitude: lat,
          longitude: lng,
        }),
      });
      if (!create.ok) {
        setError("Could not save the entry.");
        return;
      }

      router.push("/feed");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-md flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Photo
        <input
          required
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
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
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {submitting ? "Logging…" : "Log this cat"}
      </button>
    </form>
  );
}
