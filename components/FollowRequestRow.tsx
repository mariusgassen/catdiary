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
          className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => respond(false)}
          disabled={pending}
          className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-muted disabled:opacity-50"
        >
          Deny
        </button>
      </div>
    </div>
  );
}
