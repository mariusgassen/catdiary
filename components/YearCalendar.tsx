"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { YearDay } from "@/lib/yearInCats";

/**
 * The Year in Cats calendar grid: twelve month cards, each a Monday-first
 * mini-calendar. Days that hold entries get the cover thumbnail as their cell
 * and open a bottom sheet listing that day's sightings; empty days are faint.
 * All date maths are in UTC so cells line up with the UTC bucketing in
 * `lib/yearInCats.ts`.
 */

const TODAY = new Date();
const TODAY_KEY = `${TODAY.getUTCFullYear()}-${TODAY.getUTCMonth() + 1}-${TODAY.getUTCDate()}`;

export function YearCalendar({ year, days }: { year: number; days: YearDay[] }) {
  const locale = useLocale();
  const t = useTranslations("yearInCats");
  const [openDay, setOpenDay] = useState<YearDay | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, YearDay>();
    for (const d of days) map.set(`${d.month}-${d.day}`, d);
    return map;
  }, [days]);

  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) =>
        new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
          new Date(Date.UTC(year, m, 1)),
        ),
      ),
    [locale, year],
  );

  // Monday-first weekday initials, localised.
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
    // 2024-01-01 is a Monday.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
  }, [locale]);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 px-3 sm:grid-cols-2">
        {monthLabels.map((label, mIdx) => {
          const month = mIdx + 1;
          const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
          // getUTCDay: 0=Sun..6=Sat → shift to 0=Mon..6=Sun.
          const firstWeekday = (new Date(Date.UTC(year, mIdx, 1)).getUTCDay() + 6) % 7;

          return (
            <section
              key={month}
              className="rounded-xl border border-border bg-surface p-3 shadow-sm"
            >
              <h2 className="px-0.5 pb-2 text-sm font-semibold capitalize">{label}</h2>
              <div className="grid grid-cols-7 gap-1">
                {weekdayLabels.map((wd, i) => (
                  <div
                    key={`wd-${i}`}
                    className="pb-0.5 text-center text-[0.6rem] font-medium uppercase text-muted/70"
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
                  const isToday = `${year}-${month}-${day}` === TODAY_KEY;
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
                        <span className="absolute bottom-0 left-0 right-0 bg-black/45 text-center text-[0.55rem] font-semibold leading-tight text-white">
                          {day}
                        </span>
                        {bucket.entries.length > 1 && (
                          <span className="absolute right-0 top-0 rounded-bl-md bg-accent px-1 text-[0.55rem] font-bold leading-tight text-white">
                            {bucket.entries.length}
                          </span>
                        )}
                      </button>
                    );
                  }

                  return (
                    <div
                      key={day}
                      className={`flex aspect-square items-center justify-center rounded-md text-[0.6rem] text-muted/50 ${
                        isToday ? "ring-1 ring-accent/60" : ""
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
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
