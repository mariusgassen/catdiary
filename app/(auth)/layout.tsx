import Link from "next/link";
import { PawPrint } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("authLayout");

  return (
    <main className="paper-grid flex flex-1 flex-col items-center justify-center gap-7 px-6 py-14">
      <Link href="/" className="flex flex-col items-center gap-1.5 text-center">
        <PawPrint size={28} className="text-accent" aria-hidden />
        <span className="text-2xl font-bold tracking-tight">{t("title")}</span>
        <span className="text-sm text-muted">{t("tagline")}</span>
      </Link>
      {children}
    </main>
  );
}
