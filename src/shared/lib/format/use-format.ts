import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { formatDeadline } from "./deadline";
import { formatCompactMoney, formatMoney } from "./money";
import { formatQuantity } from "./quantity";
import { formatRelativeTime } from "./relative-time";
import { formatUnit } from "./unit";

/** The formatters bound to the language of the page. */
export function useFormat() {
  const locale = useLocale();
  const t = useTranslations("format");
  const justNow = t("justNow");
  return useMemo(
    () => ({
      locale,
      money: (amount: number) => formatMoney(amount, locale),
      compactMoney: (amount: number) => formatCompactMoney(amount, locale),
      quantity: (value: number) => formatQuantity(value, locale),
      unit: (unit: string, count?: number) => formatUnit(unit, locale, count),
      deadline: (iso: string, now?: Date) => formatDeadline(iso, locale, now),
      relativeTime: (iso: string, now?: Date) =>
        formatRelativeTime(iso, locale === "en" ? "en" : "vi", justNow, now),
    }),
    [locale, justNow],
  );
}
