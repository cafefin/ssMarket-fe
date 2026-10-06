const WEEKDAYS: Record<string, string> = {
  Mon: "thứ Hai",
  Tue: "thứ Ba",
  Wed: "thứ Tư",
  Thu: "thứ Năm",
  Fri: "thứ Sáu",
  Sat: "thứ Bảy",
  Sun: "Chủ nhật",
};

function parts(date: Date, timeZone?: string): Record<string, string> {
  const result: Record<string, string> = {};
  // en-GB only supplies stable part values; the Vietnamese words come from
  // WEEKDAYS so the output does not depend on the runtime's locale data.
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
 * A closing time for cards: "17:00 hôm nay", or "17:00 thứ Sáu, 9/10" on any
 * other day. The year is left out because pre-orders close within weeks.
 */
export function formatDeadline(
  iso: string,
  now: Date = new Date(),
  timeZone?: string,
): string {
  const d = parts(new Date(iso), timeZone);
  const time = `${d.hour}:${d.minute}`;
  if (closesToday(iso, now, timeZone)) {
    return `${time} hôm nay`;
  }
  return `${time} ${WEEKDAYS[d.weekday]}, ${Number(d.day)}/${d.month}`;
}
