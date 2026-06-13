import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ForbiddenError, requireAdminUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { getAdminInsights } from "@/lib/insights";
import { StatCard } from "@/components/StatCard";
import { BackLink } from "@/components/BackLink";
import { displayNameFor } from "@/lib/userDisplay";

export default async function AdminInsightsPage() {
  try {
    await requireAdminUserId();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/sign-in?callbackUrl=/admin/insights");
    if (err instanceof ForbiddenError) notFound();
    throw err;
  }

  const [insights, t] = await Promise.all([getAdminInsights(), getTranslations("insights")]);

  return (
    <div className="paper-grid min-h-dvh flex flex-col gap-4 py-4">
      <header className="mx-3 flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 shadow-sm">
        <BackLink />
        <div>
          <h1 className="text-lg font-bold tracking-tight">{t("adminTitle")}</h1>
          <p className="text-xs text-muted">{t("adminSubtitle")}</p>
        </div>
      </header>

      <section className="mx-3 grid grid-cols-2 gap-2">
        <StatCard label={t("users")} value={insights.totals.users} />
        <StatCard label={t("entries")} value={insights.totals.entries} />
        <StatCard label={t("views")} value={insights.totals.views} hint={`${insights.totals.seenPairs} ${t("seenRecords")}`} />
        <StatCard label={t("paws")} value={insights.totals.likes} />
        <StatCard label={t("notes")} value={insights.totals.comments} />
        <StatCard label={t("follows")} value={insights.totals.follows} />
      </section>

      <section className="mx-3 flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-muted">{t("growth")}</h2>
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label={t("newUsers")}
            value={insights.recent.newUsers7d}
            hint={`${insights.recent.newUsers30d} ${t("newThisMonth")}`}
          />
          <StatCard
            label={t("newEntries")}
            value={insights.recent.newEntries7d}
            hint={`${insights.recent.newEntries30d} ${t("newThisMonth")}`}
          />
        </div>
      </section>

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
                    <img src={`/api/photos/${entry.thumbKey}`} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{entry.name || t("untitled")}</p>
                  <p className="truncate text-xs text-muted">{t("byOwner", { name: displayNameFor(entry.owner) })}</p>
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
        <h2 className="px-1 text-sm font-semibold text-muted">{t("topDiarists")}</h2>
        <ul className="flex flex-col gap-2">
          {insights.topDiarists.map((d) => {
            const name = displayNameFor(d);
            return (
              <li key={d.id}>
                <Link
                  href={`/profile/${d.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent/30"
                >
                  <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <p className="text-xs text-muted tabular-nums">
                      {d.entries} {t("entries").toLowerCase()}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted">👁 {d.views}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
