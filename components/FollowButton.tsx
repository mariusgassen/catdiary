"use client";

import { useState } from "react";

export function FollowButton({
  followeeId,
  initiallyFollowing,
}: {
  followeeId: string;
  initiallyFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      const res = await fetch("/api/follows", {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followeeId }),
      });
      if (res.ok) {
        setFollowing(!following);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        following
          ? "border border-border bg-surface text-muted hover:text-foreground"
          : "bg-accent text-white shadow-sm shadow-accent/30"
      }`}
    >
      {following ? "Reading" : "Read along"}
    </button>
  );
}
