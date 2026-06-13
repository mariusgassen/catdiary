import Link from "next/link";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getDiaryInsights } from "@/lib/insights";
import { StatCard } from "@/components/StatCard";
import { BackLink } from "@/components/BackLink";
import { displayNameFor } from "@/lib/userDisplay";

export default async function InsightsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/sign-in?callbackUrl=/insights");
  }

  const [insights, t, format] = await Promise.all([
    getDiaryInsights(userId),
    getTranslations("insights"),
    getFormatter(),
  ]);

  return (
    <div className="paper-grid min-h-dvh flex flex-col gap-4 py-4">
      <header className="mx-3 flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 shadow-sm">
        <BackLink />
        <div>
          <h1 className="text-lg font-bold tracking-tight">{t("title")}</h1>
          <p className="text-xs text-muted">{t("subtitle")}</p>
        </div>
      </header>

      <section className="mx-3 grid grid-cols-2 gap-2">
        <StatCard label={t("entries")} value={insights.totalEntries} />
        <StatCard label={t("views")} value={insights.totalViews} />
        <StatCard label={t("readers")} value={insights.uniqueViewers} />
        <StatCard label={t("paws")} value={insights.totalLikes} />
        <StatCard label={t("notes")} value={insights.totalComments} />
      </section>

      {insights.totalEntries === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted">{t("noEntries")}</p>
      ) : (
        <>
          <section className="mx-3 flex flex-col gap-2">
            <h2 className="px-1 text-sm font-semibold text-muted">{t("topEntries")}</h2>
            <ul className="flex flex-col gap-2">
              {insights.topEntries.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={`/cat-entries/${entry.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:border-accent/30"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-accent-soft">
                      {entry.thumbKey && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/photos/${entry.thumbKey}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{entry.name || t("untitled")}</p>
                      <p className="text-xs text-muted">
                        {format.dateTime(entry.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-3 text-xs tabular-nums text-muted">
                      <span title={t("readers")}>👁 {entry.viewers}</span>
                      <span title={t("paws")}>🐾 {entry.likes}</span>
                      <span title={t("notes")}>📝 {entry.comments}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="mx-3 flex flex-col gap-2">
            <h2 className="px-1 text-sm font-semibold text-muted">{t("recentReaders")}</h2>
            {insights.recentReaders.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface px-4 py-5 text-center text-sm text-muted">
                {t("noReadersYet")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {insights.recentReaders.map((r, i) => {
                  const name = displayNameFor(r.user);
                  return (
                    <li
                      key={`${r.user.id}-${r.entry.id}-${i}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                    >
                      <Link
                        href={`/profile/${r.user.id}`}
                        className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
                      >
                        {name[0]?.toUpperCase() ?? "?"}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/profile/${r.user.id}`} className="truncate text-sm font-semibold hover:underline">
                          {name}
                        </Link>
                        <p className="truncate text-xs text-muted">
                          {t("readEntry", { entry: r.entry.name || t("untitled") })}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted">
                        {format.dateTime(r.lastSeenAt, { day: "numeric", month: "short" })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
