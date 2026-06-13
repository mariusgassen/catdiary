import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCatCalendar } from "@/lib/catCalendar";
import { BackLink } from "@/components/BackLink";
import { CalendarBuilder } from "@/components/CalendarBuilder";
import { displayNameFor } from "@/lib/userDisplay";
import { possessiveName } from "@/lib/possessiveDiary";

export default async function CatCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { userId } = await params;
  const { year: rawYear } = await searchParams;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const requestedYear = rawYear && /^\d{4}$/.test(rawYear) ? Number(rawYear) : undefined;

  const [profileUser, t, locale] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true },
    }),
    getTranslations("catCalendar"),
    getLocale(),
  ]);
  if (!profileUser) notFound();

  const data = await getCatCalendar(viewerId, profileUser.id, requestedYear);
  if (!data) notFound();

  const name = displayNameFor(profileUser);
  const possessive = possessiveName(locale, name);
  const hasPhotos = data.pool.length > 0;

  return (
    <div className="paper-grid min-h-dvh flex flex-col gap-4 py-4">
      <div className="no-print">
        <BackLink fallbackHref={`/profile/${profileUser.id}/year`} label={t("back")} />
      </div>

      <header className="no-print mx-3 rounded-xl border border-border bg-surface px-5 py-4 shadow-sm">
        <h1 className="text-lg font-bold tracking-tight">
          {t("title", { possessive, year: data.year })}
        </h1>
        <p className="text-xs text-muted">{t("subtitle")}</p>
        {hasPhotos && (
          <p className="pt-2 text-sm text-foreground/80">{t("intro", { year: data.year })}</p>
        )}
      </header>

      {hasPhotos ? (
        <CalendarBuilder year={data.year} months={data.months} pool={data.pool} />
      ) : (
        <p className="px-6 py-10 text-center text-sm text-muted">{t("noPhotos")}</p>
      )}
    </div>
  );
}
