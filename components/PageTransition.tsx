"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

// useLayoutEffect warns during SSR; fall back to useEffect on the server. The
// transition only matters client-side, where the layout effect runs before
// paint so the slide is applied without a flash of the page at rest.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// We tag each history entry with a monotonically-increasing index stored
// alongside (not replacing) Next's own history state, so a traversal can tell
// back from forward by comparing the landed entry's index to the current one.
type IndexedHistoryState = { __cdIdx?: number } & Record<string, unknown>;

function readHistoryIndex(): number | undefined {
  const state = window.history.state as IndexedHistoryState | null;
  return typeof state?.__cdIdx === "number" ? state.__cdIdx : undefined;
}

function stampHistoryIndex(index: number): void {
  const state = (window.history.state as IndexedHistoryState | null) ?? {};
  window.history.replaceState({ ...state, __cdIdx: index }, "");
}

/*
 * Directional page transitions between routes.
 *
 * Cat Diary is a field journal, so navigating reads like sliding to an adjacent
 * leaf: moving forward slides the new leaf in from the right, while moving back
 * slides it in from the left so the motion visibly reverses.
 *
 * Direction is decided by *how* you navigated. A `popstate` event fires only for
 * history traversal — the back/forward button or an edge-swipe — and never for
 * `router.push` from a tapped link or nav tab. A non-popstate change is always a
 * forward push. For a traversal we compare the landed entry's stored index to
 * the one we left: a lower index is "back", a higher one is "forward" (so the
 * forward button reverses correctly too). If an entry carries no index (Next can
 * replace its history state without ours), we fall back to "back" — the common
 * traversal — rather than guessing forward.
 *
 * The animation is restarted imperatively (remove class → reflow → add class) in
 * a layout effect rather than by remounting the subtree, so it runs before paint
 * with no wrong-direction flash and without tearing down page state. Query-only
 * changes (e.g. Discover's `?q=`) keep the same pathname, so search-as-you-type
 * doesn't re-trigger a transition. Purely presentational, dependency-free, and
 * collapses to a plain fade under `prefers-reduced-motion`.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const popped = useRef(false);
  const lastPath = useRef(pathname);
  const index = useRef(0);

  useEffect(() => {
    // Adopt the current entry's index if it already has one (e.g. after a
    // reload mid-history), otherwise seed it at 0.
    const existing = readHistoryIndex();
    if (existing == null) {
      stampHistoryIndex(0);
      index.current = 0;
    } else {
      index.current = existing;
    }

    function onPopState() {
      popped.current = true;
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (pathname === lastPath.current) return; // first mount or query-only change
    lastPath.current = pathname;

    let back: boolean;
    if (popped.current) {
      popped.current = false;
      const landed = readHistoryIndex();
      if (landed == null) {
        back = true; // unknown entry — default to the common traversal
      } else {
        back = landed < index.current;
        index.current = landed;
      }
    } else {
      // Forward push — a brand-new entry; stamp it with the next index.
      const next = index.current + 1;
      stampHistoryIndex(next);
      index.current = next;
      back = false;
    }

    const el = ref.current;
    if (!el) return;
    el.classList.remove("page-enter-fwd", "page-enter-back");
    void el.offsetWidth; // force reflow so re-adding the class restarts the animation
    el.classList.add(back ? "page-enter-back" : "page-enter-fwd");
  }, [pathname]);

  return (
    <div ref={ref} className="page-enter">
      {children}
    </div>
  );
}
