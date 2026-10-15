import type { Locale } from "@/shared/i18n/config";
import { MESSAGES } from "@/shared/i18n/messages";

type Forms = { one: string; other: string };

/**
 * The name of a selling unit in the language of the page. Units are stored
 * as the seller chose them from a fixed list (`units` in the message files is
 * keyed by that stored value); anything else is shown as written.
 */
export function formatUnit(unit: string, locale: Locale, count = 1): string {
  const units: Record<string, Forms | undefined> = MESSAGES[locale].units;
  const forms = units[unit];
  if (!forms) {
    return unit;
  }
  return count === 1 ? forms.one : forms.other;
}
