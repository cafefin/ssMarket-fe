import type { Locale } from "@/shared/i18n/config";
import { MESSAGES } from "@/shared/i18n/messages";

function parts(date: Date, timeZone?: string): Record<string, string> {
  const result: Record<string, string> = {};
  // en-GB only supplies stable part values; the words come from the message
  // files so the output does not depend on the runtime's locale data.
  for (const part of new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(date)) {
    result[part.type] = part.value;
  }
  return result;
}

/** Whether an instant falls on the same calendar day as `now` in the zone. */
export function closesToday(
  iso: string,
  now: Date = new Date(),
  timeZone?: string,
): boolean {
  const d = parts(new Date(iso), timeZone);
  const n = parts(now, timeZone);
  return d.year === n.year && d.month === n.month && d.day === n.day;
}

/**
 * A closing time for cards: "17:00 today", or "17:00 Fri, 9/10" on any other
 * day (in the words of `locale`). The year is left out because pre-orders
 * close within weeks.
 */
export function formatDeadline(
  iso: string,
  locale: Locale,
  now: Date = new Date(),
  timeZone?: string,
): string {
  const words = MESSAGES[locale].format;
  const d = parts(new Date(iso), timeZone);
  const time = `${d.hour}:${d.minute}`;
  if (closesToday(iso, now, timeZone)) {
    return `${time} ${words.today}`;
  }
  const weekday = words.weekdays[d.weekday as keyof typeof words.weekdays];
  return `${time} ${weekday}, ${Number(d.day)}/${Number(d.month)}`;
}
