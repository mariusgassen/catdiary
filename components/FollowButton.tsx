"use client";

import { useState } from "react";
import type { FollowStatus } from "@/lib/follows";

export function FollowButton({
  followeeId,
  initialStatus,
}: {
  followeeId: string;
  initialStatus: FollowStatus;
}) {
  const [status, setStatus] = useState<FollowStatus>(initialStatus);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      if (status === "not-tracking") {
        const res = await fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followeeId }),
        });
        if (res.ok) {
          const data = await res.json();
          setStatus(data.follow.approved ? "tracking" : "pending");
        }
      } else {
        const res = await fetch("/api/follows", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followeeId }),
        });
        if (res.ok) setStatus("not-tracking");
      }
    } finally {
      setBusy(false);
    }
  }

  const label =
    status === "tracking" ? "Tracking" : status === "pending" ? "Pending…" : "Track";

  const className =
    status === "not-tracking"
      ? "bg-accent text-white shadow-sm shadow-accent/30"
      : status === "pending"
        ? "border border-dashed border-border bg-surface text-muted hover:text-foreground"
        : "border border-border bg-surface text-muted hover:text-foreground";

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${className}`}
    >
      {label}
    </button>
  );
}
