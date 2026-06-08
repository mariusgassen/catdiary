"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FollowRequestRow({
  followerId,
  displayName,
}: {
  followerId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [resolved, setResolved] = useState(false);

  async function respond(approve: boolean) {
    setPending(true);
    try {
      const res = await fetch("/api/follows/requests", {
        method: approve ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId }),
      });
      if (res.ok) {
        setResolved(true);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  if (resolved) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <span>{displayName}</span>
      <div className="flex gap-2">
        <button
          onClick={() => respond(true)}
          disabled={pending}
          className="rounded border border-black/15 px-2 py-1 text-xs disabled:opacity-50 dark:border-white/20"
        >
          Approve
        </button>
        <button
          onClick={() => respond(false)}
          disabled={pending}
          className="rounded border border-black/15 px-2 py-1 text-xs disabled:opacity-50 dark:border-white/20"
        >
          Deny
        </button>
      </div>
    </div>
  );
}
