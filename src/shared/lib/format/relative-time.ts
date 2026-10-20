import { formatLocalDate } from "./datetime";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * "just now" under a minute, then minutes, hours and days ("3 days ago");
 * older than 7 days as dd/MM/yyyy in the browser's time zone. The "just now"
 * text comes from the message files, so a pure function holds no text.
 */
export function formatRelativeTime(
  iso: string,
  locale: "vi" | "en",
  justNow: string,
  now: Date = new Date(),
): string {
  const elapsed = now.getTime() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always" });
  if (elapsed < MINUTE) return justNow;
  if (elapsed < HOUR) return rtf.format(-Math.floor(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return rtf.format(-Math.floor(elapsed / HOUR), "hour");
  if (elapsed < WEEK) return rtf.format(-Math.floor(elapsed / DAY), "day");
  return formatLocalDate(iso);
}
