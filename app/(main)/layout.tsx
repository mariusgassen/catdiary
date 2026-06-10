"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { PullToRefresh } from "@/components/PullToRefresh";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCapture = pathname === "/capture";
  // The edit screen is a focused, full-height dialog with its own top bar.
  const isEditDialog = /^\/cat-entries\/[^/]+\/edit$/.test(pathname);
  const isFullScreen = isCapture || isEditDialog;

  return (
    <>
      <div
        className="mx-auto w-full max-w-[480px]"
        style={
          isFullScreen
            ? undefined
            : { paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }
        }
      >
        {isFullScreen ? children : <PullToRefresh>{children}</PullToRefresh>}
      </div>
      {!isFullScreen && <BottomNav />}
    </>
  );
}
