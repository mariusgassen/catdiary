"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, Send } from "lucide-react";
import { displayNameFor } from "@/lib/userDisplay";

type CatSuggestion = {
  kind: "cat" | "entry";
  catId: string | null;
  entryId: string | null;
  name: string | null;
  ownerDisplayName: string | null;
  ownerUsername: string | null;
  isOwn: boolean;
  isShared: boolean;
  immediate: boolean;
  coverPhotoKey: string | null;
  coverThumbKey: string | null;
  confidence: number;
};

const keyOf = (s: CatSuggestion) => `${s.kind}:${s.catId ?? s.entryId}`;

type LinkState = "idle" | "saving" | "filed" | "requested";

/**
 * "Might this be a cat you know?" — re-identification candidates for the
 * viewer's own sighting (CLIP look-alikes collapsed to cats). Filing under your
 * own cat is one tap; claiming someone else's cat sends them an approval
 * request. Only rendered for the sighting's owner; self-hides when there are no
 * candidates (e.g. the embedding hasn't been computed yet).
 */
export function SuggestCats({ entryId }: { entryId: string }) {
  const t = useTranslations("cats");
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<CatSuggestion[] | null>(null);
  const [states, setStates] = useState<Record<string, LinkState>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cat-entries/${entryId}/suggest-cats`)
      .then((res) => (res.ok ? res.json() : { suggestions: [] }))
      .then((data: { suggestions: CatSuggestion[] }) => {
        if (!cancelled) setSuggestions(data.suggestions);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  async function link(s: CatSuggestion) {
    const key = keyOf(s);
    setStates((prev) => ({ ...prev, [key]: "saving" }));
    try {
      const res = await fetch(`/api/cat-entries/${entryId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s.kind === "cat" ? { catId: s.catId } : { targetEntryId: s.entryId }),
      });
      if (!res.ok) {
        setStates((prev) => ({ ...prev, [key]: "idle" }));
        return;
      }
      const { status } = (await res.json()) as { status: "APPROVED" | "PENDING" };
      if (status === "APPROVED") {
        setStates((prev) => ({ ...prev, [key]: "filed" }));
        router.refresh(); // the entry now shows its cat chip
      } else {
        setStates((prev) => ({ ...prev, [key]: "requested" }));
      }
    } catch {
      setStates((prev) => ({ ...prev, [key]: "idle" }));
    }
  }

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <section className="mx-3 rounded-xl border border-dashed border-border bg-surface/60 p-4">
      <h2 className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted">{t("suggestTitle")}</h2>
      <div className="flex flex-col gap-3">
        {suggestions.map((s) => {
          const cover = s.coverThumbKey ?? s.coverPhotoKey;
          const ownerName = displayNameFor({ displayName: s.ownerDisplayName, username: s.ownerUsername });
          const key = keyOf(s);
          const state = states[key] ?? "idle";
          const catName = s.name ?? t("untitled");
          const subtitle =
            s.kind === "entry"
              ? s.isOwn
                ? t("suggestYourSighting")
                : t("suggestSightingBy", { name: ownerName })
              : s.isShared
                ? t("suggestShared")
                : s.isOwn
                  ? t("suggestYours")
                  : t("suggestBy", { name: ownerName });
          return (
            <div key={key} className="flex items-center gap-3">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/photos/${cover}`} alt={catName} className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-border" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-full bg-accent-soft text-xl ring-1 ring-border">
                  🐱
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {catName}
                  <span className="ml-1.5 font-normal text-muted">{t("matchPercent", { pct: s.confidence })}</span>
                </p>
                <p className="truncate text-xs text-muted">{subtitle}</p>
              </div>
              {state === "filed" ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <Check size={14} aria-hidden /> {t("suggestFiled")}
                </span>
              ) : state === "requested" ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                  <Send size={13} aria-hidden /> {t("suggestRequested")}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => link(s)}
                  disabled={state === "saving"}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
                >
                  {state === "saving" && <Loader2 size={12} className="animate-spin" aria-hidden />}
                  {s.immediate ? t("suggestFileButton") : t("suggestAskButton")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
