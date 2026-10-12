const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** What remains until an instant, in its largest whole unit. */
export interface TimeLeft {
  unit: "days" | "hours" | "minutes";
  count: number;
}

/**
 * How long until `iso`, rounded down to whole days, hours or minutes (never
 * "0 minutes" while time remains); null once it has passed.
 */
export function timeLeft(iso: string, now: number): TimeLeft | null {
  const left = Date.parse(iso) - now;
  if (!(left > 0)) {
    return null;
  }
  if (left >= DAY) {
    return { unit: "days", count: Math.floor(left / DAY) };
  }
  if (left >= HOUR) {
    return { unit: "hours", count: Math.floor(left / HOUR) };
  }
  return { unit: "minutes", count: Math.max(1, Math.floor(left / MINUTE)) };
}
