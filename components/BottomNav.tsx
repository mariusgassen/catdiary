"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Compass, PawPrint, Map, User } from "lucide-react";

type NavItem = { href: string; Icon: LucideIcon; label: string; isCapture?: boolean };

const NAV_ITEMS: NavItem[] = [
  { href: "/feed", Icon: BookOpen, label: "Journal" },
  { href: "/search", Icon: Compass, label: "Discover" },
  { href: "/capture", Icon: PawPrint, label: "Log a cat", isCapture: true },
  { href: "/map", Icon: Map, label: "Map" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const profileHref = session?.user?.id ? `/profile/${session.user.id}` : "/sign-in";

  function isActive(href: string) {
    if (href === profileHref || (href === "/profile" && pathname.startsWith("/profile"))) return true;
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-sm border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
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
              <span className={`font-display text-[10px] leading-none ${isActive(href) ? "italic font-semibold" : ""}`}>
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
          <User size={21} strokeWidth={pathname.startsWith("/profile") ? 2.25 : 1.75} />
          <span className={`font-display text-[10px] leading-none ${pathname.startsWith("/profile") ? "italic font-semibold" : ""}`}>
            My diary
          </span>
        </Link>
      </div>
    </nav>
  );
}
