"use client";

import { useState } from "react";
import { Loader2, UserPlus, Copy, Check } from "lucide-react";

export function InviteFriends() {
  const [busy, setBusy] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getInviteUrl(): Promise<string | null> {
    setError(null);
    try {
      const res = await fetch("/api/me/invite", { method: "POST" });
      if (!res.ok) throw new Error();
      const data: { code: string } = await res.json();
      return `${window.location.origin}/invite/${data.code}`;
    } catch {
      setError("Could not fetch your invite link.");
      return null;
    }
  }

  async function shareInvite() {
    setBusy(true);
    const url = await getInviteUrl();
    if (!url) { setBusy(false); return; }

    try {
      await navigator.share({
        title: "Join me on Cat Diary",
        text: "I keep a diary of the cats I meet — come read along.",
        url,
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    setCopying(true);
    const url = await getInviteUrl();
    if (!url) { setCopying(false); return; }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy — please copy the link manually: " + url);
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Share your personal link — anyone who joins with it follows your diary from day one.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={shareInvite}
            disabled={busy || copying}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/30 transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            Share invite link
          </button>
        )}
        <button
          onClick={copyInvite}
          disabled={busy || copying}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {copying ? (
            <Loader2 size={15} className="animate-spin" />
          ) : copied ? (
            <Check size={15} className="text-green-500" />
          ) : (
            <Copy size={15} />
          )}
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
