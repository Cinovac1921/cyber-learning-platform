const DAY_MS = 86_400_000;

/**
 * Start of the current week (Monday 00:00 in the user's local time), as a real instant.
 * `tzOffsetMinutes` is what the browser's `getTimezoneOffset()` returns:
 * UTC minus local time, in minutes (Philippines: -480).
 */
export function startOfWeek(now: Date, tzOffsetMinutes: number): Date {
  const offsetMs = -tzOffsetMinutes * 60_000;
  const local = new Date(now.getTime() + offsetMs);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  const localMidnight = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  return new Date(localMidnight - daysSinceMonday * DAY_MS - offsetMs);
}

/** 0 = Monday ... 6 = Sunday, for an instant seen in the user's local time. */
export function weekdayIndex(instant: Date, tzOffsetMinutes: number): number {
  const local = new Date(instant.getTime() - tzOffsetMinutes * 60_000);
  return (local.getUTCDay() + 6) % 7;
}