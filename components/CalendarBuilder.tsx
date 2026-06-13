"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Printer, X } from "lucide-react";
import type { CalendarCandidate, CatCalendarMonth } from "@/lib/catCalendar";

/**
 * Interactive photo-calendar builder. Each of the twelve months shows a big
 * cover photo over a Monday-first mini grid of that month in the target year —
 * a classic wall-calendar page. The suggestion can be swapped from the diary's
 * photo pool, and "Print / Save PDF" hands off to the browser, where the
 * `@media print` rules in globals.css isolate the `.calendar-print` region and
 * break each `.calendar-page` onto its own sheet.
 */
export function CalendarBuilder({
  year,
  months,
  pool,
}: {
  year: number;
  months: CatCalendarMonth[];
  pool: CalendarCandidate[];
}) {
  const locale = useLocale();
  const t = useTranslations("catCalendar");

  const [selections, setSelections] = useState<(CalendarCandidate | null)[]>(() =>
    months.map((m) => m.suggestion),
  );
  const [pickerMonth, setPickerMonth] = useState<number | null>(null);

  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) =>
        new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
          new Date(Date.UTC(year, m, 1)),
        ),
      ),
    [locale, year],
  );

  // Monday-first weekday initials. 2024-01-01 is a Monday.
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
  }, [locale]);

  function choose(monthIdx: number, candidate: CalendarCandidate) {
    setSelections((prev) => {
      const next = [...prev];
      next[monthIdx] = candidate;
      return next;
    });
    setPickerMonth(null);
  }

  return (
    <div className="calendar-print flex flex-col gap-4 pb-8">
      <div className="no-print flex justify-center px-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent/90"
        >
          <Printer size={16} />
          {t("print")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 px-3 sm:grid-cols-2">
        {monthLabels.map((label, mIdx) => {
          const month = mIdx + 1;
          const selection = selections[mIdx];
          const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
          const firstWeekday = (new Date(Date.UTC(year, mIdx, 1)).getUTCDay() + 6) % 7;

          return (
            <section
              key={month}
              className="calendar-page overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
            >
              {/* Cover photo */}
              <button
                type="button"
                onClick={() => setPickerMonth(mIdx)}
                className="group relative block aspect-[4/3] w-full overflow-hidden bg-accent-soft"
                aria-label={t("choosePhoto", { month: label })}
              >
                {selection ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/photos/${selection.photoKey}`}
                    alt={selection.name ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted">
                    {t("empty")}
                  </span>
                )}
                {selection?.name && (
                  <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/55 to-transparent px-3 py-2 text-left text-sm font-semibold text-white">
                    {selection.name}
                  </span>
                )}
                <span className="no-print absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[0.65rem] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {t("change")}
                </span>
              </button>

              {/* Month grid */}
              <div className="p-3">
                <h2 className="pb-2 text-center text-base font-bold capitalize tracking-tight">
                  {label} <span className="tabular-nums text-muted">{year}</span>
                </h2>
                <div className="grid grid-cols-7 gap-0.5">
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
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <div
                      key={i + 1}
                      className="flex aspect-square items-center justify-center text-[0.7rem] tabular-nums text-foreground/80"
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <p className="no-print px-3 text-center text-[0.7rem] text-muted/70">{t("credit")}</p>

      {pickerMonth !== null && (
        <PhotoPicker
          title={t("choosePhoto", { month: monthLabels[pickerMonth] })}
          pool={pool}
          selectedId={selections[pickerMonth]?.entryId ?? null}
          onPick={(candidate) => choose(pickerMonth, candidate)}
          onClose={() => setPickerMonth(null)}
        />
      )}
    </div>
  );
}

function PhotoPicker({
  title,
  pool,
  selectedId,
  onPick,
  onClose,
}: {
  title: string;
  pool: CalendarCandidate[];
  selectedId: string | null;
  onPick: (candidate: CalendarCandidate) => void;
  onClose: () => void;
}) {
  const t = useTranslations("yearInCats");

  return (
    <div
      className="no-print fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[75dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-base font-bold tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-lg p-1 text-muted transition-colors hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {pool.map((candidate) => (
            <button
              key={candidate.entryId}
              type="button"
              onClick={() => onPick(candidate)}
              className={`relative aspect-square overflow-hidden rounded-lg bg-accent-soft ring-1 transition-transform hover:scale-[1.03] ${
                candidate.entryId === selectedId ? "ring-2 ring-accent" : "ring-border"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${candidate.thumbKey ?? candidate.photoKey}`}
                alt={candidate.name ?? ""}
                className="h-full w-full object-cover"
              />
              {candidate.name && (
                <span className="absolute bottom-0 left-0 right-0 truncate bg-black/45 px-1 py-0.5 text-[0.6rem] font-medium text-white">
                  {candidate.name}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
