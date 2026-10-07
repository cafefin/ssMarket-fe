import type { Locale } from "@/shared/i18n/config";
import { MESSAGES } from "@/shared/i18n/messages";

const FORMATTERS: Record<Locale, Intl.NumberFormat> = {
  vi: new Intl.NumberFormat("vi-VN"),
  en: new Intl.NumberFormat("en-US"),
};

/**
 * 35000 -> "35.000" plus the Vietnamese currency sign, or "35,000 VND" in
 * English (see `format.currency`). Amounts are integer VND; never abbreviate
 * to "35k".
 */
export function formatMoney(amount: number, locale: Locale): string {
  return `${FORMATTERS[locale].format(amount)} ${MESSAGES[locale].format.currency}`;
}
