"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, X } from "lucide-react";
import { displayNameFor } from "@/lib/userDisplay";

export type PendingEntryLink = {
  id: string;
  requester: { id: string; username: string | null; displayName: string | null; avatarKey: string | null; image: string | null };
  cat: { id: string; name: string; coverPhotoKey: string | null; coverThumbKey: string | null };
};

/**
 * Pending claims that *this sighting* is someone else's cat — shown on your own
 * sighting's detail page. Approve to add this sighting to their cat's timeline,
 * or decline. The complement of `<CatLinkRequests>` (which lives on the cat
 * page for the other direction).
 */
export function EntryLinkRequests({ requests }: { requests: PendingEntryLink[] }) {
  const t = useTranslations("cats");
  const router = useRouter();
  const [pending, setPending] = useState(requests);
  const [busy, setBusy] = useState<string | null>(null);

  async function respond(linkId: string, approve: boolean) {
    setBusy(linkId);
    try {
      const res = await fetch(`/api/cat-links/${linkId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve }),
      });
      if (!res.ok) return;
      setPending((prev) => prev.filter((r) => r.id !== linkId));
      if (approve) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (pending.length === 0) return null;

  return (
    <section className="mx-3 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-semibold">{t("requestsTitle")}</h2>
      {pending.map((r) => {
        const cover = r.cat.coverThumbKey ?? r.cat.coverPhotoKey;
        const name = displayNameFor(r.requester);
        return (
          <div key={r.id} className="flex items-center gap-3">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/photos/${cover}`} alt={r.cat.name} className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-border" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-full bg-accent-soft text-xl ring-1 ring-border">
                🐱
              </span>
            )}
            <p className="min-w-0 flex-1 text-sm text-foreground/80">
              {t("entryRequestBody", { name, cat: r.cat.name })}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => respond(r.id, true)}
                disabled={busy === r.id}
                aria-label={t("requestApprove")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white transition-opacity disabled:opacity-50"
              >
                {busy === r.id ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Check size={15} aria-hidden />}
              </button>
              <button
                type="button"
                onClick={() => respond(r.id, false)}
                disabled={busy === r.id}
                aria-label={t("requestDecline")}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition-colors hover:text-foreground disabled:opacity-50"
              >
                <X size={15} aria-hidden />
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
