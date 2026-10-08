import { stepFor } from "./step";

/** Rounds away floating-point noise from decimal steps. */
function tidy(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * How much more of a product can go into the cart: the stock left minus what
 * the cart already holds. Null means no limit (a pre-order).
 */
export function addableQuantity(
  stock: number | null,
  inCart: number,
): number | null {
  return stock === null ? null : Math.max(0, tidy(stock - inCart));
}

/** The quantity a buy box starts at: one step, or what is left if less. */
export function initialQuantity(unit: string, left: number | null): string {
  const step = stepFor(unit);
  return String(left !== null && left > 0 && left < step ? left : step);
}

/** "2,5" -> "2.5"; null when it is not a positive amount the API takes. */
export function normalizeQuantity(value: string): string | null {
  const normalized = value.trim().replace(",", ".");
  return /^\d{1,7}(\.\d{1,3})?$/.test(normalized) && Number(normalized) > 0
    ? String(Number(normalized))
    : null;
}
