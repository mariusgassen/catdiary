"use client";

import { useEffect, useRef } from "react";

const FLUSH_INTERVAL_MS = 15_000;
const VISIBLE_RATIO = 0.5; // a card counts as "on screen" once half of it shows

type Delta = { impressions: number; dwellMs: number };

/**
 * Passive feed-engagement collector. Mounted once for the whole signed-in app,
 * it watches every list card (`[data-entry-id]`) with a single
 * IntersectionObserver: each time a card scrolls at least half into view it
 * counts one impression and starts a dwell timer; when it leaves, the elapsed
 * time is banked. Deltas are buffered per entry and flushed in batches — on an
 * interval, and via `sendBeacon` when the tab is hidden or unloaded — so the
 * high-volume scrolling signal costs at most one request every few seconds.
 *
 * The detail page's own card is intentionally not tagged with `data-entry-id`
 * (see `CatEntryCard`), so deliberate opens and their read depth are tracked
 * separately by `RecordView` and never double-counted here.
 */
export function EngagementTracker() {
  const buffer = useRef<Map<string, Delta>>(new Map());
  const visibleSince = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const entryIdOf = (el: Element) => (el as HTMLElement).dataset.entryId ?? null;

    const bank = (id: string, extra: Partial<Delta>) => {
      const d = buffer.current.get(id) ?? { impressions: 0, dwellMs: 0 };
      d.impressions += extra.impressions ?? 0;
      d.dwellMs += extra.dwellMs ?? 0;
      buffer.current.set(id, d);
    };

    const bankDwell = (id: string, now: number, keepVisible: boolean) => {
      const start = visibleSince.current.get(id);
      if (start == null) return;
      bank(id, { dwellMs: now - start });
      if (keepVisible) visibleSince.current.set(id, now);
      else visibleSince.current.delete(id);
    };

    const io = new IntersectionObserver(
      (records) => {
        const now = Date.now();
        for (const rec of records) {
          const id = entryIdOf(rec.target);
          if (!id) continue;
          const onScreen = rec.isIntersecting && rec.intersectionRatio >= VISIBLE_RATIO;
          if (onScreen && !visibleSince.current.has(id)) {
            visibleSince.current.set(id, now);
            bank(id, { impressions: 1 });
          } else if (!onScreen && visibleSince.current.has(id)) {
            bankDwell(id, now, false);
          }
        }
      },
      { threshold: [VISIBLE_RATIO] },
    );

    const observed = new Set<Element>();
    const observe = (el: Element) => {
      if (observed.has(el)) return;
      observed.add(el);
      io.observe(el);
    };
    const unobserve = (el: Element) => {
      if (!observed.has(el)) return;
      observed.delete(el);
      io.unobserve(el);
      const id = entryIdOf(el);
      if (id) bankDwell(id, Date.now(), false);
    };

    // Pick up cards present now and any added later (infinite scroll, navigation).
    document.querySelectorAll("[data-entry-id]").forEach(observe);
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches("[data-entry-id]")) observe(n);
          n.querySelectorAll?.("[data-entry-id]").forEach(observe);
        });
        m.removedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches("[data-entry-id]")) unobserve(n);
          n.querySelectorAll?.("[data-entry-id]").forEach(unobserve);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const flush = (useBeacon: boolean) => {
      const now = Date.now();
      // Bank time for everything still on screen without ending its session.
      for (const id of visibleSince.current.keys()) bankDwell(id, now, true);

      const events = [...buffer.current.entries()]
        .filter(([, d]) => d.impressions > 0 || d.dwellMs > 0)
        .map(([entryId, d]) => ({ entryId, impressions: d.impressions, dwellMs: d.dwellMs }));
      if (events.length === 0) return;
      buffer.current.clear();

      const body = JSON.stringify({ events });
      if (useBeacon && typeof navigator.sendBeacon === "function") {
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

    const interval = setInterval(() => flush(false), FLUSH_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", () => flush(true));

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      mo.disconnect();
      io.disconnect();
      flush(true);
    };
  }, []);

  return null;
}
