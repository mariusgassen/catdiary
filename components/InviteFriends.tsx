"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2, UserPlus, Copy, Check } from "lucide-react";

export function InviteFriends() {
  const t = useTranslations("invite.section");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    fetch("/api/me/invite", { method: "POST" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { code: string }) =>
        setInviteUrl(`${window.location.origin}/invite/${data.code}`)
      )
      .catch(() => setLoadError(true));
  }, []);

  function copyInvite() {
    if (!inviteUrl) return;
    // Call writeText synchronously within the click handler — iOS Safari
    // revokes clipboard access after any async suspension (await/then chain).
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => setCopyError(true));
  }

  async function shareInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.share({
        title: t("shareTitle"),
        text: t("shareText"),
        url: inviteUrl,
      });
    } catch {
      // dismissed
    }
  }

  const ready = inviteUrl !== null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        {t("description")}
      </p>
      {loadError ? (
        <p className="text-sm text-red-500">{t("loadError")}</p>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              onClick={shareInvite}
              disabled={!ready}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/30 transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {!ready ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              {t("shareButton")}
            </button>
          )}
          <button
            onClick={copyInvite}
            disabled={!ready}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {!ready ? (
              <Loader2 size={15} className="animate-spin" />
            ) : copied ? (
              <Check size={15} className="text-green-500" />
            ) : (
              <Copy size={15} />
            )}
            {copied ? t("copySuccess") : t("copyButton")}
          </button>
        </div>
      )}
      {copyError && inviteUrl && (
        <p className="text-sm text-red-500">
          {t("copyError")}{" "}
          <span className="select-all font-mono text-xs break-all">{inviteUrl}</span>
        </p>
      )}
    </div>
  );
}
