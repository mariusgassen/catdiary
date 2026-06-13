"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, Loader2 } from "lucide-react";

/**
 * Claim an ownerless cat as your pet, or fold it into a cat you already keep.
 * Claiming makes you the owner; merging moves this cluster's sightings into one
 * of your cats (the "claim & merge" path). Shown only on ownerless cats.
 */
export function ClaimCat({ catId, myCats }: { catId: string; myCats: { id: string; name: string }[] }) {
  const t = useTranslations("cats");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [mergeInto, setMergeInto] = useState("");

  async function claim() {
    setBusy(true);
    try {
      const res = await fetch(`/api/cats/${catId}/claim`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function merge() {
    if (!mergeInto) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cats/${catId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intoCatId: mergeInto }),
      });
      if (res.ok) {
        router.replace(`/cats/${mergeInto}`);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-dashed border-border pt-3">
      <button
        type="button"
        onClick={claim}
        disabled={busy}
        className="flex items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Home size={14} aria-hidden />}
        {t("claimButton")}
      </button>
      {myCats.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={mergeInto}
            onChange={(e) => setMergeInto(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">{t("claimMergePlaceholder")}</option>
            {myCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={merge}
            disabled={busy || !mergeInto}
            className="shrink-0 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {t("claimMergeButton")}
          </button>
        </div>
      )}
    </div>
  );
}
