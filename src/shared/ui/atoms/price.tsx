import { useLocale } from "next-intl";
import { formatMoney } from "@/shared/lib/format/money";
import { cn } from "@/shared/lib/utils";

const SIZE = { sm: "text-[15px]", md: "text-base", lg: "text-xl" } as const;

/**
 * An amount of money. It uses the body typeface at semibold, so the digits
 * sit with the words around them instead of shouting over them.
 */
export function Price({
  amount,
  size = "md",
  className,
}: {
  amount: number;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const locale = useLocale();
  return (
    <span
      className={cn("font-sans font-semibold tabular-nums", SIZE[size], className)}
    >
      {formatMoney(amount, locale)}
    </span>
  );
}
