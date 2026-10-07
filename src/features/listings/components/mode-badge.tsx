import { useTranslations } from "next-intl";
import type { ListingMode } from "../api/use-listings";
import { cn } from "@/shared/lib/utils";

const MODE_CLASSES: Record<ListingMode, string> = {
  // Green: the goods exist now. Orange: order before a closing time.
  in_stock: "bg-positive-soft text-positive-deep",
  preorder: "bg-deadline-soft text-deadline-deep",
};

export function ModeBadge({
  mode,
  className,
}: {
  mode: ListingMode;
  className?: string;
}) {
  const t = useTranslations("listings.mode");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-semibold",
        MODE_CLASSES[mode],
        className,
      )}
    >
      {t(mode)}
    </span>
  );
}
