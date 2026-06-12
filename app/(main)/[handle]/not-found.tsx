import Link from "next/link";
import { UserX } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function HandleNotFound() {
  const t = await getTranslations("handle");

  return (
    <div className="paper-grid min-h-[60vh] px-4 pt-16">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 rounded-xl border border-border bg-surface px-6 py-9 text-center shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <UserX size={26} aria-hidden />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{t("notFoundTitle")}</h1>
        <p className="text-sm text-muted">{t("notFoundBody")}</p>
        <div className="flex w-full flex-col gap-2 pt-1">
          <Link
            href="/feed"
            className="rounded-xl bg-accent px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm shadow-accent/30 transition-transform active:scale-[0.98]"
          >
            {t("backToFeed")}
          </Link>
          <Link
            href="/search"
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-sm transition-colors hover:border-accent/40"
          >
            {t("discoverPeople")}
          </Link>
        </div>
      </div>
    </div>
  );
}
