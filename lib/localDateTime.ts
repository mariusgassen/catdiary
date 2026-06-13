// Helpers for binding a `Date` to an `<input type="datetime-local">`, whose
// value is a local (no timezone) string like "2026-06-13T14:30". `new Date(value)`
// parses that string back in the browser's local zone, so only the formatting
// direction needs a helper.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Formats a Date as a `datetime-local` input value in the local timezone. */
export function toLocalDateTimeInput(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
