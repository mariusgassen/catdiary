"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";

export function InviteFriends() {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function shareInvite() {
    setBusy(true);
    setError(null);
    let url: string;
    try {
      const res = await fetch("/api/me/invite", { method: "POST" });
      if (!res.ok) throw new Error();
      const data: { code: string } = await res.json();
      url = `${window.location.origin}/invite/${data.code}`;
    } catch {
      setError("Could not fetch your invite link.");
      setBusy(false);
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join me on Cat Diary",
          text: "I keep a diary of the cats I meet — come read along.",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user dismissed the share sheet — nothing to do
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Share your personal link — anyone who joins with it follows your diary from day one.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={shareInvite}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/30 transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
          Share invite link
        </button>
        {copied && <span className="text-xs text-muted">Link copied</span>}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
