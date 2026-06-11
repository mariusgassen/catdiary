"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/* Detail pages live under the bottom tab bar but have no top chrome, so the
   only way back was a browser/OS swipe. This gives an explicit, tappable way
   back to wherever the reader came from — falling back to the journal feed
   when the entry was opened cold (e.g. a shared link). */
export function BackLink({ fallbackHref = "/", label = "Back" }: { fallbackHref?: string; label?: string }) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="mx-3 -mb-1 flex w-fit items-center gap-1 rounded-lg py-1 pr-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
      aria-label="Go back"
    >
      <ChevronLeft size={18} strokeWidth={2} />
      {label}
    </button>
  );
}
