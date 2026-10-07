"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";

/** Pieces go up by one; kg by half a kilo, a multiple of the 0.1 kg step. */
export function stepFor(unit: string): number {
  return unit === "kg" ? 0.5 : 1;
}

/** Rounds away floating-point noise from adding 0.5 steps. */
function tidy(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/**
 * − quantity + for one option. The value is a decimal string like the API's;
 * typing is allowed too, and the parent validates it.
 */
export function QuantityStepper({
  value,
  unit,
  max,
  onChange,
  disabled = false,
  label,
  className,
}: {
  value: string;
  unit: string;
  /** The stock left, when it is limited. */
  max?: number | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Accessible name of the field, e.g. the option's name. */
  label: string;
  className?: string;
}) {
  const t = useTranslations("cart");
  const step = stepFor(unit);
  const current = Number(value.replace(",", "."));
  const valid = Number.isFinite(current) && current > 0;
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
        aria-label={t("decrease")}
        disabled={disabled || !valid || current <= step}
        onClick={() => onChange(tidy(Math.max(step, current - step)))}
        className={button}
      >
        <MinusIcon aria-hidden="true" className="size-4" />
      </button>
      <input
        aria-label={label}
        inputMode={unit === "kg" ? "decimal" : "numeric"}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-11 bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
      />
      <button
        type="button"
        aria-label={t("increase")}
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
