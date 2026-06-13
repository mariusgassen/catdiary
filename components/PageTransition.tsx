"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/*
 * Diary page-turn between routes.
 *
 * Cat Diary is a field journal, so navigating reads like turning to a fresh
 * leaf: the incoming page flips in around the spine on the left and settles
 * flat. Keying the wrapper on the pathname remounts the subtree on every
 * navigation, which restarts the CSS `.page-turn` animation (defined in
 * globals.css). Query-only changes (e.g. Discover's `?q=`) keep the same
 * pathname, so search-as-you-type doesn't re-trigger the turn.
 *
 * Purely presentational and dependency-free — no animation library — and it
 * collapses to a plain fade under `prefers-reduced-motion`.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-turn">
      {children}
    </div>
  );
}
