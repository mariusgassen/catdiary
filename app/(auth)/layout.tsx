import Link from "next/link";
import { PawPrint } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="paper-grid flex flex-1 flex-col items-center justify-center gap-7 px-6 py-14">
      <Link href="/" className="flex flex-col items-center gap-1.5 text-center">
        <PawPrint size={28} className="text-accent" aria-hidden />
        <span className="text-2xl font-bold tracking-tight">Cat Diary</span>
        <span className="text-sm text-muted">A field journal for every cat you meet</span>
      </Link>
      {children}
    </main>
  );
}
