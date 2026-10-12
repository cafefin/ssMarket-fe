import { useLocale } from "next-intl";
import { useMemo } from "react";
import { formatDeadline } from "./deadline";
import { formatCompactMoney, formatMoney } from "./money";
import { formatQuantity } from "./quantity";

/** The formatters bound to the language of the page. */
export function useFormat() {
  const locale = useLocale();
  return useMemo(
    () => ({
      locale,
      money: (amount: number) => formatMoney(amount, locale),
      compactMoney: (amount: number) => formatCompactMoney(amount, locale),
      quantity: (value: number) => formatQuantity(value, locale),
      deadline: (iso: string, now?: Date) => formatDeadline(iso, locale, now),
    }),
    [locale],
  );
}
