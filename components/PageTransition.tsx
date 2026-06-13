"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";

/*
 * Simple fade between routes.
 *
 * Keying the wrapper on the pathname remounts it on every navigation, so a
 * fresh element always plays the CSS fade in `.page-enter` (globals.css).
 * Query-only changes (e.g. Discover's `?q=`) keep the same pathname, so the
 * element isn't remounted and search-as-you-type doesn't re-trigger the fade.
 * Purely presentational and collapses to nothing under `prefers-reduced-motion`.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
