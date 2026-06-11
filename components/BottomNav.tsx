"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Compass, PawPrint, Bell, User } from "lucide-react";

type NavItem = { href: string; Icon: LucideIcon; label: string; isCapture?: boolean };

const NAV_ITEMS: NavItem[] = [
  { href: "/feed", Icon: BookOpen, label: "Journal" },
  { href: "/search", Icon: Compass, label: "Discover" },
  { href: "/capture", Icon: PawPrint, label: "Log a cat", isCapture: true },
  { href: "/notifications", Icon: Bell, label: "Alerts" },
];

function useUnreadCount(enabled: boolean) {
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
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  return { count, refresh };
}

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const profileHref = session?.user?.id ? `/profile/${session.user.id}` : "/sign-in";
  const { count: unreadCount } = useUnreadCount(!!session?.user?.id);

  function isActive(href: string) {
    if (href === profileHref || (href === "/profile" && pathname.startsWith("/profile"))) return true;
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* backdrop-blur lives on a child, not on the fixed element — keeps position:fixed
          reliable on Safari/iOS where backdrop-filter on a fixed ancestor can break it */}
      <div className="bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto max-w-[480px] h-14 flex items-center justify-around px-1">
        {NAV_ITEMS.map(({ href, Icon, label, isCapture }) =>
          isCapture ? (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex h-11 w-11 -rotate-3 items-center justify-center rounded-xl bg-accent text-white shadow-md shadow-accent/40 transition-transform active:scale-95 active:rotate-0"
            >
              <Icon size={22} strokeWidth={2} />
            </Link>
          ) : href === "/notifications" ? (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                isActive(href) ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon size={21} strokeWidth={isActive(href) ? 2.25 : 1.75} />
                {unreadCount > 0 && !isActive(href) && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-0.5 text-[9px] font-bold text-white leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] leading-none ${isActive(href) ? "font-semibold" : "font-medium"}`}>
                {label}
              </span>
            </Link>
          ) : (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                isActive(href) ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              <Icon size={21} strokeWidth={isActive(href) ? 2.25 : 1.75} />
              <span className={`text-[10px] leading-none ${isActive(href) ? "font-semibold" : "font-medium"}`}>
                {label}
              </span>
            </Link>
          )
        )}
        {/* Profile tab */}
        <Link
          href={profileHref}
          aria-label="My diary"
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
            pathname.startsWith("/profile") ? "text-accent" : "text-muted hover:text-foreground"
          }`}
        >
          {(() => {
            const avatarKey = session?.user?.avatarKey;
            const avatarImage = session?.user?.image;
            const src = avatarKey ? `/api/photos/${avatarKey}` : (avatarImage ?? null);
            const active = pathname.startsWith("/profile");
            if (src) {
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt="My diary"
                  className={`w-[21px] h-[21px] rounded-full object-cover ${active ? "ring-2 ring-accent" : "opacity-70"}`}
                />
              );
            }
            return <User size={21} strokeWidth={active ? 2.25 : 1.75} />;
          })()}
          <span className={`text-[10px] leading-none ${pathname.startsWith("/profile") ? "font-semibold" : "font-medium"}`}>
            My diary
          </span>
        </Link>
      </div>
      </div>
    </nav>
  );
}
