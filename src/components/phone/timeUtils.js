import { formatDistanceToNowStrict } from "date-fns";

/**
 * shortAgo — compact relative time like a phone inbox shows ("3m", "2h", "4d").
 * Shared by the SMS inbox and the internal Messages inbox so the formatting
 * stays consistent in one place.
 */
export function shortAgo(date) {
  try {
    return formatDistanceToNowStrict(new Date(date))
      .replace(/ seconds?/, "s")
      .replace(/ minutes?/, "m")
      .replace(/ hours?/, "h")
      .replace(/ days?/, "d")
      .replace(/ months?/, "mo")
      .replace(/ years?/, "y");
  } catch {
    return "";
  }
}
