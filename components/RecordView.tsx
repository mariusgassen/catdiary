"use client";

import { useEffect, useRef } from "react";

/**
 * Detail-page engagement probe. Renders nothing. Only mounted for signed-in
 * viewers who don't own the entry (the server also enforces both, so this is
 * purely to avoid pointless requests). Two jobs:
 *
 *  1. Fire a single "seen" open (`POST .../view`) when the page mounts.
 *  2. Track passive engagement for as long as the page is open — how long it's
 *     actually on screen (dwell, paused while the tab is hidden) and how far
 *     down it was read (max scroll depth) — and flush those to `/api/engagement`
 *     on the way out via `sendBeacon`.
 *
 * Flushes send deltas: banked dwell since the last flush (the server increments
 * it) and the running max read depth (the server takes the greater), so firing
 * on both visibility-hidden and pagehide/unmount never double-counts. Failures
 * are swallowed — measuring a read must never disrupt it.
 */
export function RecordView({ entryId }: { entryId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch(`/api/cat-entries/${entryId}/view`, { method: "POST" }).catch(() => {});

    let dwellMs = 0; // banked, un-sent dwell
    let segmentStart = document.visibilityState === "visible" ? Date.now() : null;
    let maxReadPct = 0;
    let sentReadPct = 0;

    const measureScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const pct = scrollable <= 0 ? 100 : Math.round((window.scrollY / scrollable) * 100);
      maxReadPct = Math.min(100, Math.max(maxReadPct, pct));
    };
    measureScroll();

    const bankDwell = () => {
      if (segmentStart != null) {
        dwellMs += Date.now() - segmentStart;
        segmentStart = null;
      }
    };

    const send = (body: string) => {
      if (typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/engagement", new Blob([body], { type: "application/json" }));
      } else {
        void fetch("/api/engagement", {
          method: "POST",
          body,
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        }).catch(() => {});
      }
    };

    const flush = () => {
      bankDwell();
      if (dwellMs === 0 && maxReadPct <= sentReadPct) return;
      const events = [{ entryId, dwellMs, readPct: maxReadPct }];
      dwellMs = 0;
      sentReadPct = maxReadPct;
      send(JSON.stringify({ events }));
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        // A hidden tab may never fire pagehide, so bank and send now.
        flush();
      } else if (segmentStart == null) {
        segmentStart = Date.now();
      }
    };

    window.addEventListener("scroll", measureScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      window.removeEventListener("scroll", measureScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [entryId]);

  return null;
}
