"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCapture = pathname === "/capture";

  return (
    <>
      <div
        className="mx-auto w-full max-w-[480px]"
        style={
          isCapture
            ? undefined
            : { paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }
        }
      >
        {children}
      </div>
      {!isCapture && <BottomNav />}
    </>
  );
}
