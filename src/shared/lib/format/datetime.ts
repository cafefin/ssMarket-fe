function parts(
  date: Date,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-GB", options).formatToParts(
    date,
  )) {
    result[part.type] = part.value;
  }
  return result;
}

/** An instant as "17:00 10/10/2026" in the given (default: browser) time zone. */
export function formatDateTime(iso: string, timeZone?: string): string {
  const p = parts(new Date(iso), {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${p.hour}:${p.minute} ${p.day}/${p.month}/${p.year}`;
}

/** A calendar date "2026-10-12" as "12/10/2026". No time zone is involved. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

/**
 * An instant as the value of an <input type="datetime-local"> in the browser's
 * time zone: "2026-10-10T17:00".
 */
export function toDateTimeLocal(iso: string, timeZone?: string): string {
  const p = parts(new Date(iso), {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
