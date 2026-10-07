import type { Locale } from "@/shared/i18n/config";

const FORMATTERS: Record<Locale, Intl.NumberFormat> = {
  vi: new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }),
  en: new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }),
};

/** 2.5 -> "2,5" (vi) or "2.5" (en); at most three decimals. */
export function formatQuantity(value: number, locale: Locale): string {
  return FORMATTERS[locale].format(value);
}
