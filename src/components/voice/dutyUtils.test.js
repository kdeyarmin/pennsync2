import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isScheduledOffActive,
  isOffDutyNow,
  scheduleState,
  getUpcomingWeekend,
} from "./dutyUtils.js";

const iso = (s) => new Date(s).toISOString();

test("isScheduledOffActive is true only inside a valid window", () => {
  const start = iso("2026-06-06T00:00:00Z");
  const end = iso("2026-06-08T00:00:00Z");
  assert.equal(isScheduledOffActive(start, end, new Date("2026-06-07T12:00:00Z")), true);
  assert.equal(isScheduledOffActive(start, end, new Date("2026-06-05T12:00:00Z")), false); // before
  assert.equal(isScheduledOffActive(start, end, new Date("2026-06-09T12:00:00Z")), false); // after
});

test("isScheduledOffActive rejects missing, invalid, or inverted ranges", () => {
  const now = new Date("2026-06-07T12:00:00Z");
  assert.equal(isScheduledOffActive(null, null, now), false);
  assert.equal(isScheduledOffActive("not a date", iso("2026-06-08T00:00:00Z"), now), false);
  // end before start
  assert.equal(isScheduledOffActive(iso("2026-06-08T00:00:00Z"), iso("2026-06-06T00:00:00Z"), now), false);
});

test("isOffDutyNow honors the manual toggle regardless of schedule", () => {
  assert.equal(isOffDutyNow({ duty_status: "off_duty" }), true);
  assert.equal(isOffDutyNow({ duty_status: "on_duty" }, new Date("2026-06-07T12:00:00Z")), false);
});

test("isOffDutyNow flips off during an active scheduled window even when on duty", () => {
  const user = {
    duty_status: "on_duty",
    scheduled_off_duty_start: iso("2026-06-06T00:00:00Z"),
    scheduled_off_duty_end: iso("2026-06-08T00:00:00Z"),
  };
  assert.equal(isOffDutyNow(user, new Date("2026-06-07T12:00:00Z")), true);
  assert.equal(isOffDutyNow(user, new Date("2026-06-09T12:00:00Z")), false); // window expired -> back on duty
});

test("isOffDutyNow tolerates null/undefined user", () => {
  assert.equal(isOffDutyNow(null), false);
  assert.equal(isOffDutyNow(undefined), false);
});

test("scheduleState classifies the window relative to now", () => {
  const start = iso("2026-06-06T00:00:00Z");
  const end = iso("2026-06-08T00:00:00Z");
  assert.equal(scheduleState(start, end, new Date("2026-06-05T00:00:00Z")), "upcoming");
  assert.equal(scheduleState(start, end, new Date("2026-06-07T00:00:00Z")), "active");
  assert.equal(scheduleState(start, end, new Date("2026-06-09T00:00:00Z")), "expired");
  assert.equal(scheduleState(null, end, new Date("2026-06-07T00:00:00Z")), "none");
});

test("getUpcomingWeekend returns Saturday 00:00 -> Monday 00:00 from a weekday", () => {
  // 2026-06-03 is a Wednesday.
  const { start, end } = getUpcomingWeekend(new Date("2026-06-03T09:30:00"));
  assert.equal(start.getDay(), 6); // Saturday
  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
  assert.equal(end.getDay(), 1); // Monday
  assert.equal(end.getHours(), 0);
  // Two days between Saturday 00:00 and Monday 00:00.
  assert.equal((end.getTime() - start.getTime()) / (1000 * 60 * 60), 48);
});

test("getUpcomingWeekend starting on the weekend keeps the current window", () => {
  // 2026-06-07 is a Sunday afternoon.
  const now = new Date("2026-06-07T14:00:00");
  const { start, end } = getUpcomingWeekend(now);
  assert.equal(start.getTime(), now.getTime()); // starts now, mid-weekend
  assert.equal(end.getDay(), 1); // next Monday 00:00
  assert.ok(end.getTime() > start.getTime());
});
