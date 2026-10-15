import { lineTotal, toThousandths } from "@/features/listings";
import type { Translator } from "@/shared/i18n/translator";
import { LISTING_UNITS } from "./units";

export const MAX_COMBOS = 3;

/** "35.000" / "35,000" / " 35000 " -> 35000; anything else -> NaN. */
export function parsePrice(text: string): number {
  const digits = text.trim().replace(/[.,\s]/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : Number.NaN;
}

/** Accepts "2,5" as well as "2.5". Returns a canonical decimal string or null. */
export function parseQuantity(text: string): string | null {
  const normalized = text.trim().replace(",", ".");
  return /^\d{1,7}(\.\d{1,3})?$/.test(normalized) ? normalized : null;
}

/** Adds issues for unit, unit price and combos; shared by the listing and round schemas. */
export function checkProduct(
  value: {
    unit: string;
    unitPrice: string;
    combos: { quantity: string; price: string }[];
  },
  issue: (path: (string | number)[], message: string) => void,
  t: Translator<"sell.validation">,
): void {
  if (!(LISTING_UNITS as readonly string[]).includes(value.unit)) {
    issue(["unit"], t("unit"));
  }
  const price = parsePrice(value.unitPrice);
  if (Number.isNaN(price) || price < 1_000 || price > 1_000_000_000) {
    issue(["unitPrice"], t("unitPrice"));
  }
  if (value.combos.length > MAX_COMBOS) {
    issue(["combos"], t("comboCount", { max: MAX_COMBOS }));
  }
  const step = value.unit === "kg" ? 100 : 1000;
  const sizes = new Set<number>();
  value.combos.forEach((combo, index) => {
    const path = ["combos", index];
    const quantity = parseQuantity(combo.quantity);
    const size = quantity === null ? null : toThousandths(quantity);
    if (size === null || size <= step || size % step !== 0) {
      issue([...path, "quantity"], t("comboQuantity"));
      return;
    }
    if (sizes.has(size)) {
      issue([...path, "quantity"], t("comboDuplicate"));
    }
    sizes.add(size);
    const comboPrice = parsePrice(combo.price);
    if (
      Number.isNaN(comboPrice) ||
      comboPrice < 1_000 ||
      comboPrice > 1_000_000_000 ||
      (!Number.isNaN(price) && comboPrice >= lineTotal(price, quantity as string))
    ) {
      issue([...path, "price"], t("comboPrice"));
    }
  });
}
