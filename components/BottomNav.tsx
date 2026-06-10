"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import { Home, Search, Camera, MapPin, User } from "lucide-react";

type NavItem = { href: string; Icon: LucideIcon; label: string; isCapture?: boolean };

const NAV_ITEMS: NavItem[] = [
  { href: "/feed", Icon: Home, label: "Feed" },
  { href: "/search", Icon: Search, label: "Search" },
  { href: "/capture", Icon: Camera, label: "Capture", isCapture: true },
  { href: "/map", Icon: MapPin, label: "Map" },
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
      className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto max-w-[480px] h-14 flex items-center justify-around px-1">
        {NAV_ITEMS.map(({ href, Icon, label, isCapture }) =>
          isCapture ? (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-md shadow-accent/40 transition-transform active:scale-95"
            >
              <Icon size={22} strokeWidth={2} />
            </Link>
          ) : (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive(href)
                  ? "text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon size={22} strokeWidth={isActive(href) ? 2.5 : 1.75} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        )}
        {/* Profile tab */}
        <Link
          href={profileHref}
          aria-label="Profile"
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
            pathname.startsWith("/profile") ? "text-accent" : "text-muted hover:text-foreground"
          }`}
        >
          <User size={22} strokeWidth={pathname.startsWith("/profile") ? 2.5 : 1.75} />
          <span className="text-[10px] font-medium leading-none">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
