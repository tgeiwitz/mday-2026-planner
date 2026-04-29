/**
 * UTC-safe date helpers. Our backend stores plain calendar dates (blockDate,
 * forecastDate) as UTC timestamps pinned to midnight America/New_York
 * (04:00 UTC during EDT). Browsers in different TZs render these as the
 * previous day if we format using local time, which is why we centralize
 * all date formatting here and always read getUTC* values.
 */

export function toUTCDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  // Accept both full ISO ("2026-04-29T04:00:00.000Z") and plain "YYYY-MM-DD".
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(`${d}T00:00:00.000Z`);
  }
  return new Date(d);
}

/** Returns YYYY-MM-DD using UTC getters. */
export function toISODate(d: string | Date): string {
  const dt = toUTCDate(d);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** "Wed, Apr 29" */
export function fmtDate(d: string | Date): string {
  return toUTCDate(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Apr 29" — short form without the weekday */
export function fmtDateShort(d: string | Date): string {
  return toUTCDate(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Wed" — weekday only */
export function dayName(d: string | Date): string {
  return toUTCDate(d).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

/** Today's calendar date in America/New_York, returned as YYYY-MM-DD. */
export function todayNY(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

/** Add n calendar days to a YYYY-MM-DD string (UTC-safe). */
export function addDays(iso: string, n: number): string {
  const d = toUTCDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

/** Compare two YYYY-MM-DD strings (lexicographic works for ISO dates). */
export function isBefore(a: string, b: string): boolean {
  return a < b;
}

export function isOnOrAfter(a: string, b: string): boolean {
  return a >= b;
}
