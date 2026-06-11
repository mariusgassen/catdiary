"use client";

import { LayoutGrid, List } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function ProfileViewToggle({ view }: { view: "list" | "grid" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setView(v: "list" | "grid") {
    const next = new URLSearchParams(params.toString());
    if (v === "list") next.delete("view");
    else next.set("view", v);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
      <button
        onClick={() => setView("list")}
        className={`rounded p-1.5 transition-colors ${
          view === "list" ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground"
        }`}
        aria-label="List view"
        aria-pressed={view === "list"}
      >
        <List size={16} />
      </button>
      <button
        onClick={() => setView("grid")}
        className={`rounded p-1.5 transition-colors ${
          view === "grid" ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground"
        }`}
        aria-label="Grid view"
        aria-pressed={view === "grid"}
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}
