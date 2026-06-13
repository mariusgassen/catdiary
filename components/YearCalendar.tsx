"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { YearDay } from "@/lib/yearInCats";

/**
 * The Year in Cats calendar: one month at a time as a Monday-first grid. It
 * opens on the current calendar month (today's cell highlighted when the
 * displayed year is the current year) and steps month-by-month within the year.
 * Days that hold entries show the cover thumbnail and open a bottom sheet
 * listing that day's sightings. All date maths are in UTC so cells line up with
 * the UTC bucketing in `lib/yearInCats.ts`.
 */

const TODAY = new Date();
const TODAY_YEAR = TODAY.getUTCFullYear();
const TODAY_MONTH = TODAY.getUTCMonth(); // 0-11
const TODAY_DAY = TODAY.getUTCDate();

export function YearCalendar({ year, days }: { year: number; days: YearDay[] }) {
  const locale = useLocale();
  const t = useTranslations("yearInCats");
  const [openDay, setOpenDay] = useState<YearDay | null>(null);
  // Default to the current calendar month — the month the diarist is living in.
  const [monthIdx, setMonthIdx] = useState(TODAY_MONTH);

  const byDay = useMemo(() => {
    const map = new Map<string, YearDay>();
    for (const d of days) map.set(`${d.month}-${d.day}`, d);
    return map;
  }, [days]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
        new Date(Date.UTC(year, monthIdx, 1)),
      ),
    [locale, year, monthIdx],
  );

  // Monday-first weekday initials, localised. 2024-01-01 is a Monday.
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
  }, [locale]);

  const month = monthIdx + 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // getUTCDay: 0=Sun..6=Sat → shift to 0=Mon..6=Sun.
  const firstWeekday = (new Date(Date.UTC(year, monthIdx, 1)).getUTCDay() + 6) % 7;
  const monthCount = useMemo(
    () =>
      days
        .filter((d) => d.month === month)
        .reduce((sum, d) => sum + d.entries.length, 0),
    [days, month],
  );

  return (
    <>
      <section className="mx-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
        {/* Month switcher */}
        <div className="flex items-center justify-between pb-3">
          <button
            type="button"
            onClick={() => setMonthIdx((m) => Math.max(0, m - 1))}
            disabled={monthIdx === 0}
            aria-label={t("prevMonth")}
            className="rounded-lg p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-base font-bold capitalize tracking-tight">
              {monthLabel} <span className="tabular-nums text-muted">{year}</span>
            </h2>
            {monthCount > 0 && (
              <p className="text-[0.7rem] text-muted">{t("monthEntries", { count: monthCount })}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMonthIdx((m) => Math.min(11, m + 1))}
            disabled={monthIdx === 11}
            aria-label={t("nextMonth")}
            className="rounded-lg p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weekdayLabels.map((wd, i) => (
            <div
              key={`wd-${i}`}
              className="pb-0.5 text-center text-[0.65rem] font-medium uppercase text-muted/70"
            >
              {wd}
            </div>
          ))}
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div key={`blank-${i}`} aria-hidden />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const bucket = byDay.get(`${month}-${day}`);
            const isToday = year === TODAY_YEAR && monthIdx === TODAY_MONTH && day === TODAY_DAY;
            const cover = bucket?.entries[0]?.thumbKey ?? null;

            if (bucket) {
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setOpenDay(bucket)}
                  aria-label={t("daySightings", { day, count: bucket.entries.length })}
                  className={`relative aspect-square overflow-hidden rounded-md bg-accent-soft ring-1 ring-border transition-transform hover:scale-105 ${
                    isToday ? "ring-2 ring-accent" : ""
                  }`}
                >
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/photos/${cover}`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                  <span className="absolute bottom-0 left-0 right-0 bg-black/45 text-center text-[0.6rem] font-semibold leading-tight text-white">
                    {day}
                  </span>
                  {bucket.entries.length > 1 && (
                    <span className="absolute right-0 top-0 rounded-bl-md bg-accent px-1 text-[0.6rem] font-bold leading-tight text-white">
                      {bucket.entries.length}
                    </span>
                  )}
                </button>
              );
            }

            return (
              <div
                key={day}
                className={`flex aspect-square items-center justify-center rounded-md text-xs ${
                  isToday
                    ? "font-bold text-accent ring-2 ring-accent"
                    : "text-muted/60"
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </section>

      {openDay && (
        <DaySheet
          day={openDay}
          label={new Intl.DateTimeFormat(locale, {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(Date.UTC(year, openDay.month - 1, openDay.day)))}
          onClose={() => setOpenDay(null)}
        />
      )}
    </>
  );
}

function DaySheet({
  day,
  label,
  onClose,
}: {
  day: YearDay;
  label: string;
  onClose: () => void;
}) {
  const t = useTranslations("yearInCats");

  return (
    <div
      // z-[60] so the sheet sits above the bottom nav (z-50) instead of being
      // overlapped by it.
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[70dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-base font-bold tracking-tight">{label}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-lg p-1 text-muted transition-colors hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {day.entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/cat-entries/${entry.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 transition-colors hover:border-accent/30"
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
                  {entry.breed && <p className="truncate text-xs text-muted">{entry.breed}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
