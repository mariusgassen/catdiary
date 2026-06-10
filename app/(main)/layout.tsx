import { BottomNav } from "@/components/BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        className="mx-auto w-full max-w-[480px]"
        style={{ paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {children}
      </div>
      <BottomNav />
    </>
  );
}
