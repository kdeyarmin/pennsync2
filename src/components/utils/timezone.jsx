import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { format as dateFnsFormat } from 'date-fns';

const EASTERN_TIMEZONE = 'America/New_York';

/**
 * Format a date in Eastern Time
 * @param {Date|string|number} date - The date to format
 * @param {string} formatStr - The format string (e.g., 'MMM d, yyyy', 'PPpp')
 * @returns {string} Formatted date string in Eastern Time
 */
export const formatEastern = (date, formatStr = 'MMM d, yyyy HH:mm') => {
  if (!date) return '';
  try {
    // Parse the date - handle both ISO strings and Date objects
    const dateObj = date instanceof Date ? date : new Date(date);
    // Format in Eastern Time - the date is already in UTC from the database
    return formatInTimeZone(dateObj, EASTERN_TIMEZONE, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Get current date/time in Eastern Time
 * @returns {Date} Current date in Eastern timezone
 */
export const nowEastern = () => {
  return toZonedTime(new Date(), EASTERN_TIMEZONE);
};

/**
 * Convert a date to Eastern Time zone
 * @param {Date|string|number} date - The date to convert
 * @returns {Date} Date object in Eastern timezone
 */
export const toEastern = (date) => {
  if (!date) return null;
  try {
    return toZonedTime(new Date(date), EASTERN_TIMEZONE);
  } catch (error) {
    console.error('Error converting to Eastern time:', error);
    return null;
  }
};

/**
 * Get today's date in Eastern Time formatted as YYYY-MM-DD
 * @returns {string} Today's date in Eastern Time
 */
export const todayEastern = () => {
  return formatInTimeZone(new Date(), EASTERN_TIMEZONE, 'yyyy-MM-dd');
};

/**
 * Format relative time in Eastern Time (e.g., "2 hours ago")
 * @param {Date|string|number} date - The date to format
 * @returns {string} Relative time string
 */
export const formatRelativeEastern = (date) => {
  if (!date) return '';
  try {
    const easternDate = toZonedTime(new Date(date), EASTERN_TIMEZONE);
    const now = toZonedTime(new Date(), EASTERN_TIMEZONE);
    const diffMs = now - easternDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatInTimeZone(easternDate, EASTERN_TIMEZONE, 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
};

export default {
  formatEastern,
  nowEastern,
  toEastern,
  todayEastern,
  formatRelativeEastern,
  EASTERN_TIMEZONE
};