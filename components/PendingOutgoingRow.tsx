"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { possessiveDiaryEn, possessiveDiaryDe } from "@/lib/possessiveDiary";

export function PendingOutgoingRow({
  followeeId,
  displayName,
}: {
  followeeId: string;
  displayName: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [resolved, setResolved] = useState(false);
  const [busy, setBusy] = useState(false);

  const possessiveDiary =
    locale === "de"
      ? possessiveDiaryDe(displayName)
      : possessiveDiaryEn(displayName);

  if (resolved) return null;

  async function cancel() {
    setBusy(true);
    try {
      const res = await fetch("/api/follows", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followeeId }),
      });
      if (res.ok) {
        setResolved(true);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        href={`/profile/${followeeId}`}
        className="min-w-0 truncate text-sm font-medium hover:text-accent"
      >
        {possessiveDiary}
      </Link>
      <button
        onClick={cancel}
        disabled={busy}
        className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-red-300 hover:text-red-500 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}
