/**
 * dutyUtils — shared on/off-duty logic for the 8x8 phone integration.
 *
 * A nurse is "off duty" either because they flipped the manual switch, or
 * because a scheduled time-off window (e.g. the weekend) is active right now.
 * The inbound call/SMS webhooks read this live at call time, so a schedule
 * needs no cron job — it simply takes effect and expires on its own.
 *
 * These helpers are mirrored inline in the Deno backend functions (single-file
 * deploy model); this unit-tested copy is the source of truth.
 */

/** Parse a date-ish value to epoch ms, or null if missing/invalid. */
function toTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * True when `now` falls inside a valid scheduled time-off window. The window is
 * only honored when both ends parse and end is strictly after start.
 */
export function isScheduledOffActive(start, end, now = new Date()) {
  const s = toTime(start);
  const e = toTime(end);
  if (s === null || e === null || e <= s) return false;
  const t = now.getTime();
  return t >= s && t <= e;
}

/**
 * True when the nurse should be treated as off duty at `now` — manual off-duty
 * toggle OR an active scheduled window.
 */
export function isOffDutyNow(user, now = new Date()) {
  if (!user) return false;
  if (user.duty_status === "off_duty") return true;
  return isScheduledOffActive(user.scheduled_off_duty_start, user.scheduled_off_duty_end, now);
}

/**
 * Status of a scheduled window relative to `now`, for the UI:
 * "none" | "active" | "upcoming" | "expired".
 */
export function scheduleState(start, end, now = new Date()) {
  const s = toTime(start);
  const e = toTime(end);
  if (s === null || e === null || e <= s) return "none";
  const t = now.getTime();
  if (t < s) return "upcoming";
  if (t > e) return "expired";
  return "active";
}

/**
 * The upcoming weekend as a { start, end } pair of local-time Dates: Saturday
 * 00:00 through Monday 00:00. If it's already the weekend, the window starts
 * now so toggling it on mid-weekend still covers the rest of it.
 */
export function getUpcomingWeekend(now = new Date()) {
  const day = now.getDay(); // 0 Sun ... 6 Sat
  const start = new Date(now);
  if (day !== 6 && day !== 0) {
    start.setDate(start.getDate() + (6 - day)); // advance to Saturday
    start.setHours(0, 0, 0, 0);
  }
  // End at the next Monday 00:00 at or after the window's date.
  const end = new Date(start);
  end.setHours(0, 0, 0, 0);
  do {
    end.setDate(end.getDate() + 1);
  } while (end.getDay() !== 1); // 1 = Monday
  return { start, end };
}
