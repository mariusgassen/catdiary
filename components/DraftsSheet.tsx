"use client";

import { useEffect, useMemo } from "react";
import { Trash2, FileClock } from "lucide-react";
import type { CaptureDraftMeta } from "@/lib/captureDrafts";

type Props = {
  drafts: CaptureDraftMeta[];
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function DraftsSheet({ drafts, onResume, onDelete, onClose }: Props) {
  // Build object URLs for the cover thumbnails and revoke them on unmount.
  const covers = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of drafts) {
      if (d.coverBlob) map.set(d.id, URL.createObjectURL(d.coverBlob));
    }
    return map;
  }, [drafts]);

  useEffect(() => {
    return () => covers.forEach((url) => URL.revokeObjectURL(url));
  }, [covers]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <button className="flex-1 bg-black/50" aria-label="Dismiss" onClick={onClose} />
      <div
        className="max-h-[70vh] overflow-y-auto rounded-t-2xl bg-[#1c1c1e] pb-[env(safe-area-inset-bottom,16px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto my-2 h-1 w-10 rounded-full bg-white/20" />
        <p className="px-5 pb-2 pt-1 text-xs font-medium uppercase tracking-wide text-white/40">
          Saved drafts
        </p>

        {drafts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-white/40">
            <FileClock size={28} />
            <p className="text-sm">No saved drafts yet.</p>
          </div>
        ) : (
          <ul>
            {drafts.map((d) => {
              const cover = covers.get(d.id);
              const title = d.caption.trim() || d.catName.trim() || "Untitled post";
              return (
                <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 active:bg-white/5">
                  <button
                    onClick={() => onResume(d.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2c2c2e]">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <FileClock size={20} className="text-white/40" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{title}</span>
                      <span className="block truncate text-xs text-white/45">
                        {d.photoCount} photo{d.photoCount === 1 ? "" : "s"}
                        {d.locationName ? ` · ${d.locationName}` : ""} · {relativeTime(d.updatedAt)}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => onDelete(d.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/50 active:bg-white/10"
                    aria-label="Delete draft"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <button
          onClick={onClose}
          className="mx-4 mb-3 mt-2 w-[calc(100%-2rem)] rounded-xl bg-[#2c2c2e] py-3.5 text-sm font-semibold text-white active:bg-white/10"
        >
          Close
        </button>
      </div>
    </div>
  );
}
