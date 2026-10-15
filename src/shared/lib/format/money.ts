import type { Locale } from "@/shared/i18n/config";
import { MESSAGES } from "@/shared/i18n/messages";

const FORMATTERS: Record<Locale, Intl.NumberFormat> = {
  vi: new Intl.NumberFormat("vi-VN"),
  en: new Intl.NumberFormat("en-US"),
};

/**
 * 35000 -> "35.000" plus the Vietnamese currency sign, or "35,000 VND" in
 * English (see `format.currency`). Amounts are integer VND; a price is never
 * abbreviated to "35k" (formatCompactMoney is for filter labels only).
 */
export function formatMoney(amount: number, locale: Locale): string {
  return `${FORMATTERS[locale].format(amount)} ${MESSAGES[locale].format.currency}`;
}

const COMPACT: Record<Locale, Intl.NumberFormat> = {
  vi: new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }),
  en: new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }),
};

/**
 * 200000 -> "200k", 1500000 -> "1,5tr" ("200K", "1.5M" in English). For tight
 * labels such as the price filter; amounts under a thousand stay in full.
 */
export function formatCompactMoney(amount: number, locale: Locale): string {
  if (amount < 1_000) {
    return formatMoney(amount, locale);
  }
  const { thousand, million } = MESSAGES[locale].format;
  return amount < 1_000_000
    ? `${COMPACT[locale].format(amount / 1_000)}${thousand}`
    : `${COMPACT[locale].format(amount / 1_000_000)}${million}`;
}
