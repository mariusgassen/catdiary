"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

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
 * Directional page-fold transition between routes.
 *
 * Cat Diary is a field journal, so each navigation folds the new leaf into
 * place like turning a page: moving forward folds in hinged on the right edge,
 * moving back hinged on the left so the motion visibly reverses.
 *
 * Direction is decided by *how* you navigated. A `popstate` fires only for
 * history traversal — the back/forward button or an edge-swipe — never for a
 * `router.push` from a tapped link or nav tab, which is always a forward push.
 * For a traversal we compare the landed entry's stored index to the one we
 * left: lower is "back", higher is "forward" (so the forward button reverses
 * correctly too). Entries with no index fall back to "back", the common
 * traversal.
 *
 * Keying the wrapper on the pathname remounts it on every navigation, so a
 * fresh element always plays the animation — no "did the effect re-fire?"
 * uncertainty. The fold direction is applied in a callback ref, which runs in
 * the commit phase before paint (so there's no flash) and is where reading refs
 * is allowed (unlike during render). Query-only changes (e.g. Discover's `?q=`)
 * keep the same pathname, so the element isn't remounted and search-as-you-type
 * doesn't re-trigger a fold. Purely presentational, dependency-free, and
 * collapses to a plain fade under `prefers-reduced-motion`.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const popped = useRef(false);
  const index = useRef(0);
  const firstMount = useRef(true);

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

  // Runs each time the keyed element mounts — i.e. on every navigation — during
  // commit, before paint. The first mount (cold page load) is skipped so the
  // app doesn't fold itself in on arrival.
  const applyFold = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }

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

    node.classList.add(back ? "page-fold-back" : "page-fold-fwd");
  }, []);

  return (
    <div key={pathname} ref={applyFold} className="page-enter">
      {children}
    </div>
  );
}
