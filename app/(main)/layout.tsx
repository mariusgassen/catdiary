"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { EngagementTracker } from "@/components/EngagementTracker";
import { PageTransition } from "@/components/PageTransition";
import { PullToRefresh } from "@/components/PullToRefresh";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCapture = pathname === "/capture";
  // The edit screen is a focused, full-height dialog with its own top bar.
  const isEditDialog = /^\/cat-entries\/[^/]+\/edit$/.test(pathname);
  const isFullScreen = isCapture || isEditDialog;
  // Map gets the full viewport with no width cap — the page handles its own height.
  const isMap = pathname === "/map";

  return (
    <>
      <div
        className={isMap ? "w-full" : "mx-auto w-full max-w-[480px]"}
        style={
          isFullScreen || isMap
            ? undefined
            : { paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }
        }
      >
        {isFullScreen || isMap ? (
          children
        ) : (
          <PullToRefresh>
            <PageTransition>{children}</PageTransition>
          </PullToRefresh>
        )}
      </div>
      {!isFullScreen && <BottomNav />}
      <EngagementTracker />
    </>
  );
}
