export const AUTO_FETCH_MIN_INTERVAL_MINUTES = 15;
export const AUTO_FETCH_MAX_INTERVAL_MINUTES = 10080; // 7 days
export const AUTO_FETCH_DEFAULT_INTERVAL_MINUTES = 1440; // 24 hours

export const clampAutoFetchInterval = (interval?: number | null): number => {
  if (interval === undefined || interval === null || Number.isNaN(interval)) {
    return AUTO_FETCH_DEFAULT_INTERVAL_MINUTES;
  }
  const floored = Math.floor(interval);
  return Math.min(AUTO_FETCH_MAX_INTERVAL_MINUTES, Math.max(AUTO_FETCH_MIN_INTERVAL_MINUTES, floored));
};

export const computeNextAutoFetchRun = (
  intervalMinutes: number,
  from: Date = new Date(),
  timezone?: string
): Date => {
  const base = new Date(from.getTime() + intervalMinutes * 60 * 1000);
  if (!timezone) {
    return base;
  }
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = formatter.formatToParts(base);
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)?.value || '0');
    const zoned = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')));
    return zoned;
  } catch (error) {
    console.warn('[VideoAutoFetch] Failed to apply timezone for next run', error);
    return base;
  }
};

