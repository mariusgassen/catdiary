"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2, X, Home } from "lucide-react";

type CatFormProps = {
  // Edit mode when an existing cat is passed; create mode otherwise.
  cat?: {
    id: string;
    name: string;
    breed: string | null;
    color: string | null;
    description: string | null;
    isOwned: boolean;
  };
  /** Where to return after deleting a cat (the owner's profile). */
  ownerProfileHref?: string;
};

/*
 * Mobile-style sheet to create or edit a cat profile — mirrors the entry edit
 * screen: Cancel on the left, Save on the right, Delete demoted to the bottom.
 */
export function CatForm({ cat, ownerProfileHref }: CatFormProps) {
  const router = useRouter();
  const t = useTranslations("cats");
  const isEdit = Boolean(cat);

  const [name, setName] = useState(cat?.name ?? "");
  const [breed, setBreed] = useState(cat?.breed ?? "");
  const [color, setColor] = useState(cat?.color ?? "");
  const [description, setDescription] = useState(cat?.description ?? "");
  const [isOwned, setIsOwned] = useState(cat?.isOwned ?? false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const busy = submitting || deleting;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("errorName"));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        breed: breed.trim() || null,
        color: color.trim() || null,
        description: description.trim() || null,
        isOwned,
      };
      const res = await fetch(isEdit ? `/api/cats/${cat!.id}` : "/api/cats", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(t("errorSave"));
        return;
      }
      if (isEdit) {
        router.back();
        router.refresh();
      } else {
        const { cat: created } = await res.json();
        router.replace(`/cats/${created.id}`);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!cat) return;
    if (!confirm(t("deleteConfirm"))) return;

    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/cats/${cat.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError(t("errorDelete"));
        return;
      }
      router.replace(ownerProfileHref ?? "/feed");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const inputClass =
    "rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-muted";

  return (
    <form onSubmit={handleSubmit} className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-[480px] items-center justify-between px-1">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={busy}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            <X size={16} aria-hidden />
            {t("cancel")}
          </button>
          <h1 className="text-sm font-semibold">{isEdit ? t("editTitle") : t("createTitle")}</h1>
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-accent disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" aria-hidden />}
            {submitting ? t("saving") : t("save")}
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-4">
        <input
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className={inputClass}
        />
        <input
          placeholder={t("breedPlaceholder")}
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          maxLength={120}
          className={inputClass}
        />
        <input
          placeholder={t("colorPlaceholder")}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          maxLength={120}
          className={inputClass}
        />
        <textarea
          placeholder={t("descriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
          className={`${inputClass} resize-none`}
        />

        {/* "My cat" vs "a cat I've met" — the claimed/met distinction. */}
        <button
          type="button"
          onClick={() => setIsOwned((v) => !v)}
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-sm"
        >
          <span className="flex items-center gap-2">
            <Home size={15} className="text-accent" aria-hidden />
            <span>
              <span className="font-medium">{t("ownedToggle")}</span>
              <span className="block text-xs text-muted">{t("ownedHint")}</span>
            </span>
          </span>
          <span
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${isOwned ? "bg-accent" : "bg-border"}`}
            aria-hidden
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isOwned ? "left-[1.125rem]" : "left-0.5"}`}
            />
          </span>
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {isEdit && (
          <div className="mt-auto flex justify-center border-t border-dashed border-border pt-4 pb-6">
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-600/10 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Trash2 size={14} aria-hidden />}
              {deleting ? t("deleting") : t("delete")}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
