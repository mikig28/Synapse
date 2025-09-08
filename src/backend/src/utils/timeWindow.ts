import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
import { startOfDay, endOfDay, addDays, subDays } from 'date-fns';

export interface TimeWindow {
  localStart: Date;
  localEnd: Date;
  utcStart: Date;
  utcEnd: Date;
  timezone: string;
  label?: string;
}

export interface TimeWindowOptions {
  inclusive?: boolean; // Whether end time should be inclusive (default: true)
  label?: string;
}

/**
 * Get local day window (00:00:00 to 23:59:59.999) in specified timezone
 * Converts to UTC for database queries while maintaining timezone semantics
 */
export function getLocalDayWindow(
  timezone: string,
  date: Date | string = new Date(),
  options: TimeWindowOptions = {}
): TimeWindow {
  const { inclusive = true, label } = options;
  
  // Parse date if string
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) {
    throw new Error(`Invalid date provided: ${date}`);
  }

  // Get the date in the target timezone (this handles DST automatically)
  const zonedDate = utcToZonedTime(targetDate, timezone);
  
  // Create start and end of day in the target timezone
  const localStart = startOfDay(zonedDate);
  const localEnd = inclusive 
    ? endOfDay(zonedDate) // 23:59:59.999
    : startOfDay(addDays(zonedDate, 1)); // 00:00:00 next day (exclusive)
  
  // Convert to UTC for database queries
  const utcStart = zonedTimeToUtc(localStart, timezone);
  const utcEnd = zonedTimeToUtc(localEnd, timezone);

  return {
    localStart,
    localEnd,
    utcStart,
    utcEnd,
    timezone,
    label: label || formatDateLabel(zonedDate, timezone)
  };
}

/**
 * Get today's time window in specified timezone
 */
export function getTodayWindow(timezone: string): TimeWindow {
  return getLocalDayWindow(timezone, new Date(), { label: 'Today' });
}

/**
 * Get yesterday's time window in specified timezone
 */
export function getYesterdayWindow(timezone: string): TimeWindow {
  const yesterday = subDays(new Date(), 1);
  return getLocalDayWindow(timezone, yesterday, { label: 'Yesterday' });
}

/**
 * Get last 24 hours window (rolling 24-hour period from now)
 */
export function getLast24HoursWindow(timezone?: string): TimeWindow {
  const now = new Date();
  const utcEnd = now;
  const utcStart = subDays(now, 1);
  
  // If timezone provided, convert to local times for display
  const localEnd = timezone ? utcToZonedTime(utcEnd, timezone) : utcEnd;
  const localStart = timezone ? utcToZonedTime(utcStart, timezone) : utcStart;
  
  return {
    localStart,
    localEnd,
    utcStart,
    utcEnd,
    timezone: timezone || 'UTC',
    label: 'Last 24 Hours'
  };
}

/**
 * Create custom time window between two dates
 */
export function getCustomWindow(
  startDate: Date | string,
  endDate: Date | string,
  timezone: string,
  options: TimeWindowOptions = {}
): TimeWindow {
  const { inclusive = true, label } = options;
  
  const parsedStart = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const parsedEnd = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
    throw new Error(`Invalid date range: ${startDate} to ${endDate}`);
  }

  // Convert to timezone-specific dates
  const localStart = utcToZonedTime(parsedStart, timezone);
  const localEnd = inclusive 
    ? endOfDay(utcToZonedTime(parsedEnd, timezone))
    : startOfDay(addDays(utcToZonedTime(parsedEnd, timezone), 1));
  
  // Convert back to UTC for DB queries
  const utcStart = zonedTimeToUtc(localStart, timezone);
  const utcEnd = zonedTimeToUtc(localEnd, timezone);

  return {
    localStart,
    localEnd,
    utcStart,
    utcEnd,
    timezone,
    label: label || `${format(localStart, 'MMM dd', { timeZone: timezone })} - ${format(localEnd, 'MMM dd', { timeZone: timezone })}`
  };
}

/**
 * Format date label for timezone
 */
function formatDateLabel(date: Date, timezone: string): string {
  return format(date, 'EEEE, MMMM do, yyyy', { timeZone: timezone });
}

/**
 * Check if a timestamp falls within a time window
 */
export function isWithinWindow(timestamp: Date, window: TimeWindow): boolean {
  return timestamp >= window.utcStart && timestamp <= window.utcEnd;
}

/**
 * Get timezone-safe query bounds for MongoDB
 * Returns the UTC start and end times suitable for database queries
 */
export function getQueryBounds(window: TimeWindow): { start: Date; end: Date } {
  return {
    start: window.utcStart,
    end: window.utcEnd
  };
}

/**
 * Parse timezone from string with fallback
 */
export function parseTimezone(timezoneInput?: string): string {
  const defaultTimezone = 'Asia/Jerusalem';
  
  if (!timezoneInput) return defaultTimezone;
  
  // Validate timezone
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezoneInput });
    return timezoneInput;
  } catch {
    console.warn(`Invalid timezone '${timezoneInput}', falling back to ${defaultTimezone}`);
    return defaultTimezone;
  }
}

/**
 * Debug helper to log time window details
 */
export function logTimeWindow(window: TimeWindow, context?: string): void {
  const prefix = context ? `[${context}]` : '[TimeWindow]';
  console.log(`${prefix} Time Window Details:`, {
    timezone: window.timezone,
    label: window.label,
    localStart: window.localStart.toISOString(),
    localEnd: window.localEnd.toISOString(),
    utcStart: window.utcStart.toISOString(),
    utcEnd: window.utcEnd.toISOString(),
    localStartFormatted: format(window.localStart, 'yyyy-MM-dd HH:mm:ss zzz', { timeZone: window.timezone }),
    localEndFormatted: format(window.localEnd, 'yyyy-MM-dd HH:mm:ss zzz', { timeZone: window.timezone })
  });
}