"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";
import { stepFor } from "@/shared/lib/quantity-step";

/** Rounds away floating-point noise from adding 0.5 steps. */
function tidy(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/**
 * − quantity + for one product. The value is a decimal string like the API's;
 * typing is allowed too, and the parent validates it. With `min={0}` the
 * quantity may be nothing at all: an empty field counts as zero.
 */
export function QuantityStepper({
  value,
  unit,
  min,
  max,
  onChange,
  disabled = false,
  label,
  className,
}: {
  value: string;
  unit: string;
  /** The least the − button goes down to; one step unless given. */
  min?: number;
  /** The stock left, when it is limited. */
  max?: number | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Accessible name of the field. */
  label: string;
  className?: string;
}) {
  const t = useTranslations("common");
  const step = stepFor(unit);
  const current = Number(value.replace(",", "."));
  const least = min ?? step;
  // Zero (or an empty field) is a quantity only where nothing may be chosen.
  const valid =
    Number.isFinite(current) && (current > 0 || (least === 0 && current === 0));
  const atMax = max !== null && max !== undefined && valid && current >= max;
  const button =
    "flex size-9 shrink-0 items-center justify-center rounded-full text-foreground outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50 disabled:text-border";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border",
        className,
      )}
    >
      <button
        type="button"
        aria-label={t("decreaseQuantity")}
        disabled={disabled || !valid || current <= least}
        onClick={() => onChange(tidy(Math.max(least, current - step)))}
        className={button}
      >
        <MinusIcon aria-hidden="true" className="size-4" />
      </button>
      <input
        aria-label={label}
        inputMode={unit === "kg" ? "decimal" : "numeric"}
        value={value}
        placeholder={least === 0 ? "0" : undefined}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-11 bg-transparent text-center text-sm font-semibold tabular-nums outline-none placeholder:text-muted-foreground"
      />
      <button
        type="button"
        aria-label={t("increaseQuantity")}
        disabled={disabled || atMax}
        onClick={() =>
          onChange(tidy(valid ? current + step : step))
        }
        className={button}
      >
        <PlusIcon aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
