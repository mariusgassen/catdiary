import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getYearInCats } from "@/lib/yearInCats";
import { BackLink } from "@/components/BackLink";
import { StatCard } from "@/components/StatCard";
import { YearCalendar } from "@/components/YearCalendar";
import { displayNameFor } from "@/lib/userDisplay";
import { possessiveName } from "@/lib/possessiveDiary";
import { CalendarPlus } from "lucide-react";

export default async function YearInCatsPage({
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
    getTranslations("yearInCats"),
    getLocale(),
  ]);
  if (!profileUser) notFound();

  const data = await getYearInCats(viewerId, profileUser.id, requestedYear);
  if (!data) notFound();

  const name = displayNameFor(profileUser);
  const possessive = possessiveName(locale, name);
  const monthLabel =
    data.busiestMonth !== null
      ? new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
          new Date(Date.UTC(data.year, data.busiestMonth - 1, 1)),
        )
      : null;

  return (
    <div className="paper-grid min-h-dvh flex flex-col gap-4 py-4">
      <BackLink fallbackHref={`/profile/${profileUser.id}`} />

      <header className="mx-3 rounded-xl border border-border bg-surface px-5 py-4 shadow-sm">
        <h1 className="text-lg font-bold tracking-tight">{t("title", { possessive })}</h1>
        <p className="text-xs text-muted">{t("subtitle")}</p>

        <Link
          href={`/profile/${profileUser.id}/calendar`}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent/90"
        >
          <CalendarPlus size={14} />
          {t("createCalendar")}
        </Link>

        {data.availableYears.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pt-3">
            {data.availableYears.map((y) => (
              <Link
                key={y}
                href={`/profile/${profileUser.id}/year?year=${y}`}
                scroll={false}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums transition-colors ${
                  y === data.year
                    ? "border-accent bg-accent text-white"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        )}
      </header>

      {data.totalEntries === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted">{t("emptyYear")}</p>
      ) : (
        <>
          <section className="mx-3 grid grid-cols-2 gap-2">
            <StatCard label={t("catsLogged")} value={data.totalEntries} />
            <StatCard label={t("namedCats")} value={data.namedCats} />
            <StatCard label={t("breeds")} value={data.breeds} />
            <StatCard label={t("places")} value={data.places} />
            {monthLabel && (
              <StatCard
                label={t("busiestMonth")}
                value={monthLabel}
                hint={t("entriesCount", { count: data.busiestMonthCount })}
              />
            )}
          </section>

          <YearCalendar year={data.year} days={data.days} />
        </>
      )}
    </div>
  );
}
