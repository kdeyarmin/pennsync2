/**
 * Pure helpers for the time-off / PTO system.
 *
 * Intentionally free of React and SDK imports so the logic stays unit-testable
 * with `node --test` (see timeOffUtils.test.js), matching the convention used
 * by phoneUtils, smsUtils, etc. in this repo.
 */

export const REQUEST_TYPES = [
  { value: "vacation", label: "Vacation / PTO", color: "blue" },
  { value: "sick", label: "Sick Leave", color: "amber" },
  { value: "personal", label: "Personal Day", color: "violet" },
  { value: "bereavement", label: "Bereavement", color: "slate" },
  { value: "jury_duty", label: "Jury Duty", color: "slate" },
  { value: "parental", label: "Parental Leave", color: "pink" },
  { value: "unpaid", label: "Unpaid Leave", color: "slate" },
  { value: "other", label: "Other", color: "slate" },
];

export const STATUSES = [
  { value: "pending", label: "Pending", color: "amber" },
  { value: "approved", label: "Approved", color: "emerald" },
  { value: "denied", label: "Denied", color: "red" },
  { value: "cancelled", label: "Cancelled", color: "slate" },
];

export function typeLabel(value) {
  return REQUEST_TYPES.find((t) => t.value === value)?.label || value || "—";
}

export function statusLabel(value) {
  return STATUSES.find((s) => s.value === value)?.label || value || "—";
}

/**
 * Parse a `YYYY-MM-DD` (or full ISO) string into a local Date at midnight.
 * Building the Date from explicit parts avoids the UTC-shift bug you get from
 * `new Date("2026-01-01")`, which can land on the previous day in some zones.
 */
export function parseISODate(value) {
  if (!value) return null;
  const datePart = String(value).slice(0, 10);
  const parts = datePart.split("-").map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d || parts.length !== 3) return null;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

/** Format a Date (or date string) back to a `YYYY-MM-DD` string. */
export function toISODate(date) {
  const d = date instanceof Date ? date : parseISODate(date);
  if (!d || isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Count business days (Mon–Fri), inclusive, between two date strings. */
export function businessDaysBetween(start, end) {
  const s = parseISODate(start);
  const e = parseISODate(end);
  if (!s || !e || e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Calendar (inclusive) day count between two date strings. */
export function calendarDaysBetween(start, end) {
  const s = parseISODate(start);
  const e = parseISODate(end);
  if (!s || !e || e < s) return 0;
  return Math.round((e - s) / 86400000) + 1;
}

/**
 * Total requested days, counting business days and honoring a single
 * half-day flag (which subtracts 0.5 from the total).
 */
export function totalRequestedDays(start, end, halfDay = false) {
  const business = businessDaysBetween(start, end);
  if (business === 0) return 0;
  if (halfDay) return Math.max(0.5, business - 0.5);
  return business;
}

/** Does a request's date range cover the given `YYYY-MM-DD` day? */
export function requestCoversDate(request, isoDate) {
  const d = parseISODate(isoDate);
  const s = parseISODate(request?.start_date);
  const e = parseISODate(request?.end_date);
  if (!d || !s || !e) return false;
  return d >= s && d <= e;
}

/** Do two inclusive date ranges overlap at all? */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const as = parseISODate(aStart);
  const ae = parseISODate(aEnd);
  const bs = parseISODate(bStart);
  const be = parseISODate(bEnd);
  if (!as || !ae || !bs || !be) return false;
  return as <= be && bs <= ae;
}

/** A request is "upcoming" if it has not fully ended as of `today`. */
export function isUpcoming(request, today = new Date()) {
  const e = parseISODate(request?.end_date);
  if (!e) return false;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return e >= t;
}

/** Is an approved request active on the given day? */
export function isActiveOnDate(request, isoDate) {
  return request?.status === "approved" && requestCoversDate(request, isoDate);
}

/**
 * Sum of approved days, optionally constrained to a calendar year (by the
 * request's start date). Used for the employee balance summary.
 */
export function approvedDaysInYear(requests = [], year) {
  return requests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => {
      const s = parseISODate(r.start_date);
      if (!s) return sum;
      if (year && s.getFullYear() !== year) return sum;
      const days =
        Number(r.total_days) ||
        totalRequestedDays(r.start_date, r.end_date, r.half_day);
      return sum + days;
    }, 0);
}

/** Validate a request's core date fields. Returns an error string or null. */
export function validateRequestDates(start, end) {
  const s = parseISODate(start);
  const e = parseISODate(end);
  if (!s) return "Please choose a start date.";
  if (!e) return "Please choose an end date.";
  if (e < s) return "The end date can't be before the start date.";
  return null;
}

/**
 * Human-friendly date range, e.g. "Mar 3" or "Mar 3 – Mar 7, 2026".
 * Locale-formatted, so not asserted in unit tests.
 */
export function formatDateRange(start, end) {
  const s = parseISODate(start);
  const e = parseISODate(end);
  if (!s) return "—";
  const base = { month: "short", day: "numeric" };
  if (!e || toISODate(s) === toISODate(e)) {
    return s.toLocaleDateString(undefined, { ...base, year: "numeric" });
  }
  const sameYear = s.getFullYear() === e.getFullYear();
  const startStr = s.toLocaleDateString(undefined, sameYear ? base : { ...base, year: "numeric" });
  const endStr = e.toLocaleDateString(undefined, { ...base, year: "numeric" });
  return `${startStr} – ${endStr}`;
}
