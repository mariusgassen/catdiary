/**
 * A single big-number stat tile used on the insights dashboards. Purely
 * presentational (server-renderable) — styled to match the field-journal
 * surface cards used across the app.
 */
export function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
      <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
      <span className="text-xs font-medium text-muted">{label}</span>
      {hint && <span className="text-[0.7rem] text-muted/80">{hint}</span>}
    </div>
  );
}
