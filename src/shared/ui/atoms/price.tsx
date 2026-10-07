import { useLocale, useTranslations } from "next-intl";
import { formatMoney } from "@/shared/lib/format/money";
import { cn } from "@/shared/lib/utils";

const SIZE = { 20: "text-xl", 22: "text-[22px]", 36: "text-4xl" } as const;
const MUTED = "font-sans text-[13px] font-normal text-muted-foreground";

/** An amount of money in the heading typeface, optionally "from …/unit". */
export function Price({
  amount,
  size,
  from = false,
  unit,
  unitStyle = "muted",
  className,
}: {
  amount: number;
  size: keyof typeof SIZE;
  from?: boolean;
  unit?: string;
  unitStyle?: "muted" | "inline";
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("common");
  return (
    <span className={cn("font-heading font-bold", SIZE[size], className)}>
      {from && <span className={MUTED}>{t("priceFrom")} </span>}
      {formatMoney(amount, locale)}
      {unit &&
        (unitStyle === "muted" ? (
          <span className={MUTED}>/{unit}</span>
        ) : (
          `/${unit}`
        ))}
    </span>
  );
}
