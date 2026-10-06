import type { ListingMode } from "@/lib/api/use-listings";
import { cn } from "@/lib/utils";

const MODES: Record<ListingMode, { label: string; className: string }> = {
  // Green: the goods exist now. Orange: order before a closing time.
  in_stock: { label: "Có sẵn", className: "bg-positive-soft text-positive-deep" },
  preorder: {
    label: "Đặt trước",
    className: "bg-deadline-soft text-deadline-deep",
  },
};

export function ModeBadge({
  mode,
  className,
}: {
  mode: ListingMode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-semibold",
        MODES[mode].className,
        className,
      )}
    >
      {MODES[mode].label}
    </span>
  );
}
