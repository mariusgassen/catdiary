"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Loader2, Send } from "lucide-react";
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

type MyCat = {
  id: string;
  displayName: string | null;
  coverPhotoKey: string | null;
  coverThumbKey: string | null;
};

type JoinableCluster = MyCat & { distanceKm: number | null };

type JoinableSighting = {
  id: string;
  name: string | null;
  coverPhotoKey: string | null;
  coverThumbKey: string | null;
  distanceKm: number | null;
};

type LinkState = "idle" | "saving" | "filed" | "requested" | "toofar";

const suggestionKey = (s: CatSuggestion) => `${s.kind}:${s.catId ?? s.entryId}`;

/**
 * "Is this a cat you know?" — collapsible re-identification panel at the bottom
 * of a sighting's detail page. Open it to see CLIP look-alike *suggestions* and
 * to *manually* pick one of your cats. Works on your own sightings (file it) and
 * on other people's (request that it's your cat — they confirm). Collapsed by
 * default so it stays out of the way.
 */
export function CatMatcher({ entryId, isOwner }: { entryId: string; isOwner: boolean }) {
  const t = useTranslations("cats");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CatSuggestion[]>([]);
  const [myCats, setMyCats] = useState<MyCat[]>([]);
  const [clusters, setClusters] = useState<JoinableCluster[]>([]);
  const [sightings, setSightings] = useState<JoinableSighting[]>([]);
  const [states, setStates] = useState<Record<string, LinkState>>({});
  const [filter, setFilter] = useState("");

  // Lazily load suggestions and your own cats the first time the panel opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(`/api/cat-entries/${entryId}/suggest-cats`)
      .then((r) => (r.ok ? r.json() : { suggestions: [] }))
      .then((d: { suggestions?: CatSuggestion[] }) => {
        if (!cancelled) setSuggestions(d.suggestions ?? []);
      })
      .catch(() => {});
    fetch("/api/cats")
      .then((r) => (r.ok ? r.json() : { cats: [] }))
      .then((d: { cats?: MyCat[] }) => {
        if (!cancelled) setMyCats(d.cats ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, entryId]);

  // Your own bare sightings + shared clusters to join: nearby when no filter,
  // searched (debounced) when typing.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const q = filter.trim();
    const t = setTimeout(() => {
      fetch(`/api/cat-entries/${entryId}/clusters${q ? `?q=${encodeURIComponent(q)}` : ""}`)
        .then((r) => (r.ok ? r.json() : { clusters: [], sightings: [] }))
        .then((d: { clusters?: JoinableCluster[]; sightings?: JoinableSighting[] }) => {
          if (!cancelled) {
            setClusters(d.clusters ?? []);
            setSightings(d.sightings ?? []);
          }
        })
        .catch(() => {});
    }, q ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, entryId, filter]);

  async function link(body: { catId?: string; targetEntryId?: string }, key: string) {
    setStates((prev) => ({ ...prev, [key]: "saving" }));
    try {
      const res = await fetch(`/api/cat-entries/${entryId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        setStates((prev) => ({ ...prev, [key]: err?.error === "TOO_FAR" ? "toofar" : "idle" }));
        return;
      }
      const { status } = (await res.json()) as { status: "APPROVED" | "PENDING" };
      if (status === "APPROVED") {
        setStates((prev) => ({ ...prev, [key]: "filed" }));
        router.refresh();
      } else {
        setStates((prev) => ({ ...prev, [key]: "requested" }));
      }
    } catch {
      setStates((prev) => ({ ...prev, [key]: "idle" }));
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-3 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface/60 px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ChevronDown size={15} aria-hidden />
        {isOwner ? t("matchOpenOwner") : t("matchOpenOther")}
      </button>
    );
  }

  const suggestedCatIds = new Set(suggestions.map((s) => s.catId).filter(Boolean));
  const suggestedEntryIds = new Set(suggestions.map((s) => s.entryId).filter(Boolean));
  const manualCats = myCats.filter((c) => !suggestedCatIds.has(c.id));
  // Bare sightings already shown as embedding suggestions don't need a second row.
  const manualSightings = sightings.filter((s) => !suggestedEntryIds.has(s.id));
  const needle = filter.trim().toLowerCase();
  const filtered = needle
    ? manualCats.filter((c) => (c.displayName ?? "").toLowerCase().includes(needle))
    : manualCats;

  return (
    <section className="mx-3 rounded-xl border border-dashed border-border bg-surface/60 p-4">
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {isOwner ? t("matchOpenOwner") : t("matchOpenOther")}
        </h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-accent">
          {t("matchClose")}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="pb-3">
          <p className="pb-2 text-[11px] font-medium uppercase tracking-wide text-muted/70">{t("matchSuggested")}</p>
          <div className="flex flex-col gap-3">
            {suggestions.map((s) => {
              const ownerName = displayNameFor({ displayName: s.ownerDisplayName, username: s.ownerUsername });
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
              const key = suggestionKey(s);
              return (
                <MatchRow
                  key={key}
                  cover={s.coverThumbKey ?? s.coverPhotoKey}
                  title={s.name ?? t("untitled")}
                  confidence={s.confidence}
                  subtitle={subtitle}
                  immediate={s.immediate}
                  state={states[key] ?? "idle"}
                  onAction={() => link(s.kind === "cat" ? { catId: s.catId! } : { targetEntryId: s.entryId! }, key)}
                />
              );
            })}
          </div>
        </div>
      )}

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={t("matchFilter")}
        className="mb-2 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent"
      />
      <p className="pb-2 text-[11px] font-medium uppercase tracking-wide text-muted/70">{t("matchYourCats")}</p>
      {filtered.length === 0 ? (
        <p className="py-2 text-xs text-muted">{t("matchNoCats")}</p>
      ) : (
        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {filtered.map((c) => {
            const key = `manual:${c.id}`;
            return (
              <MatchRow
                key={key}
                cover={c.coverThumbKey ?? c.coverPhotoKey}
                title={c.displayName ?? t("untitled")}
                subtitle={t("suggestYours")}
                immediate={isOwner}
                state={states[key] ?? "idle"}
                onAction={() => link({ catId: c.id }, key)}
              />
            );
          })}
        </div>
      )}

      {manualSightings.length > 0 && (
        <div className="pt-3">
          <p className="pb-2 text-[11px] font-medium uppercase tracking-wide text-muted/70">{t("matchYourSightings")}</p>
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {manualSightings.map((s) => {
              const key = `sighting:${s.id}`;
              return (
                <MatchRow
                  key={key}
                  cover={s.coverThumbKey ?? s.coverPhotoKey}
                  title={s.name ?? t("untitled")}
                  subtitle={s.distanceKm != null ? t("clusterDistance", { km: s.distanceKm.toFixed(1) }) : t("suggestYourSighting")}
                  immediate={isOwner}
                  state={states[key] ?? "idle"}
                  onAction={() => link({ targetEntryId: s.id }, key)}
                />
              );
            })}
          </div>
        </div>
      )}

      {clusters.length > 0 && (
        <div className="pt-3">
          <p className="pb-2 text-[11px] font-medium uppercase tracking-wide text-muted/70">{t("matchClusters")}</p>
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {clusters.map((c) => {
              const key = `cluster:${c.id}`;
              return (
                <MatchRow
                  key={key}
                  cover={c.coverThumbKey ?? c.coverPhotoKey}
                  title={c.displayName ?? t("untitled")}
                  subtitle={c.distanceKm != null ? t("clusterDistance", { km: c.distanceKm.toFixed(1) }) : t("suggestShared")}
                  immediate={isOwner}
                  state={states[key] ?? "idle"}
                  onAction={() => link({ catId: c.id }, key)}
                />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function MatchRow({
  cover,
  title,
  confidence,
  subtitle,
  immediate,
  state,
  onAction,
}: {
  cover: string | null;
  title: string;
  confidence?: number;
  subtitle: string;
  immediate: boolean;
  state: LinkState;
  onAction: () => void;
}) {
  const t = useTranslations("cats");
  return (
    <div className="flex items-center gap-3">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/photos/${cover}`} alt={title} className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-border" />
      ) : (
        <span className="flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-full bg-accent-soft text-xl ring-1 ring-border">
          🐱
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {title}
          {confidence != null && (
            <span className="ml-1.5 font-normal text-muted">{t("matchPercent", { pct: confidence })}</span>
          )}
        </p>
        <p className="truncate text-xs text-muted">{subtitle}</p>
      </div>
      {state === "filed" ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
          <Check size={14} aria-hidden /> {t("suggestFiled")}
        </span>
      ) : state === "toofar" ? (
        <span className="shrink-0 text-xs font-semibold text-muted">{t("matchTooFar")}</span>
      ) : state === "requested" ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-muted">
          <Send size={13} aria-hidden /> {t("suggestRequested")}
        </span>
      ) : (
        <button
          type="button"
          onClick={onAction}
          disabled={state === "saving"}
          className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {state === "saving" && <Loader2 size={12} className="animate-spin" aria-hidden />}
          {immediate ? t("suggestFileButton") : t("suggestAskButton")}
        </button>
      )}
    </div>
  );
}
