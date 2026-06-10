"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode, type TouchEvent } from "react";
import { PawPrint } from "lucide-react";

/** Damped pull distance (px) at which releasing triggers a refresh. */
const TRIGGER_AT = 56;
const MAX_PULL = 96;
const REFRESH_BAR = 44;

/*
 * Touch-only pull-to-refresh for the page scroller (the document body).
 * Pulling down from the very top reveals a paw that inks in as you go; past
 * the threshold, releasing re-fetches the current route's server data via
 * router.refresh(). The gesture is axis-locked so horizontal swipes (photo
 * stacks) never trigger it.
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [isRefreshing, startTransition] = useTransition();
  const startY = useRef<number | null>(null);
  const startX = useRef(0);
  const axis = useRef<"v" | "h" | null>(null);

  function reset() {
    startY.current = null;
    axis.current = null;
    setPull(0);
  }

  function handleTouchStart(e: TouchEvent) {
    if (window.scrollY > 0 || isRefreshing) return;
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    axis.current = null;
  }

  function handleTouchMove(e: TouchEvent) {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    const dx = e.touches[0].clientX - startX.current;
    if (axis.current == null && (Math.abs(dy) > 8 || Math.abs(dx) > 8)) {
      axis.current = Math.abs(dy) > Math.abs(dx) ? "v" : "h";
    }
    if (axis.current !== "v" || window.scrollY > 0 || dy <= 0) {
      if (pull !== 0) setPull(0);
      return;
    }
    setPull(Math.min(dy / 2, MAX_PULL)); // damped, like stretching paper
  }

  function handleTouchEnd() {
    if (pull >= TRIGGER_AT) {
      startTransition(() => router.refresh());
    }
    reset();
  }

  // pull is only non-zero mid-drag (it resets on release), so the snap-back
  // and refresh-bar height changes animate while the drag itself stays 1:1.
  const dragging = pull > 0;
  const indicatorHeight = isRefreshing ? REFRESH_BAR : pull;

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        style={{ height: indicatorHeight }}
        className={`flex items-end justify-center overflow-hidden ${dragging ? "" : "transition-[height] duration-200"}`}
        aria-hidden={!isRefreshing}
      >
        <PawPrint
          size={22}
          role={isRefreshing ? "status" : undefined}
          aria-label={isRefreshing ? "Refreshing" : undefined}
          className={`mb-2.5 text-accent ${isRefreshing ? "animate-bounce" : ""}`}
          style={
            isRefreshing
              ? undefined
              : { opacity: Math.min(pull / TRIGGER_AT, 1), transform: `rotate(${pull * 2}deg)` }
          }
          fill={pull >= TRIGGER_AT || isRefreshing ? "currentColor" : "none"}
        />
      </div>
      {children}
    </div>
  );
}
