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
      className="rounded border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/20"
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
