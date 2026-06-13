"use client";

import { useEffect, useRef } from "react";

/**
 * Fires a single "seen" ping for an entry when the detail page mounts. Renders
 * nothing. Only mounted for signed-in viewers who don't own the entry (the
 * server also enforces both, so this is purely to avoid pointless requests).
 * Failures are swallowed — recording a view must never disrupt reading.
 */
export function RecordView({ entryId }: { entryId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch(`/api/cat-entries/${entryId}/view`, { method: "POST" }).catch(() => {});
  }, [entryId]);

  return null;
}
