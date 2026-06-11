"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

export function NotificationBell() {
  const { data: session } = useSession();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unread=1", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { count: number };
        setCount(data.count);
      }
    } catch {
      // ignore network errors
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [session?.user?.id, refresh]);

  if (!session?.user?.id) return null;

  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      className="relative p-1.5 -m-1.5 text-muted hover:text-foreground transition-colors"
    >
      <Bell size={20} strokeWidth={1.75} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-0.5 text-[9px] font-bold text-white leading-none">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
