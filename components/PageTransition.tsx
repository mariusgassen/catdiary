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

/*
 * Directional page transitions between routes.
 *
 * Cat Diary is a field journal, so navigating reads like sliding to an adjacent
 * leaf: tapping forward into a page slides the new leaf in from the right, while
 * going back slides it in from the left so the motion visibly reverses.
 *
 * Direction is decided by *how* you navigated. A `popstate` event fires only for
 * history traversal — the browser/device back button or an edge-swipe — and
 * never for `router.push` from a tapped link or nav tab. So a path change
 * preceded by a `popstate` is treated as "back" and everything else as
 * "forward"; this is what lets the back action drive its own (reversed)
 * navigation animation instead of replaying the forward one.
 *
 * The animation is restarted imperatively (remove class → reflow → add class)
 * in a layout effect rather than by remounting the subtree, so it runs before
 * paint with no wrong-direction flash and without tearing down page state.
 * Query-only changes (e.g. Discover's `?q=`) keep the same pathname, so
 * search-as-you-type doesn't re-trigger a transition. Purely presentational,
 * dependency-free, and collapses to a plain fade under `prefers-reduced-motion`.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const popped = useRef(false);
  const lastPath = useRef(pathname);

  useEffect(() => {
    function onPopState() {
      popped.current = true;
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (pathname === lastPath.current) return; // first mount or query-only change
    lastPath.current = pathname;

    const el = ref.current;
    if (!el) return;
    const back = popped.current;
    popped.current = false;

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
