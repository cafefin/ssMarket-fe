// These rules mirror src/modules/orders/order-math.ts in the backend and are
// tested with the same table, so the total shown here equals the total the
// server computes. The server's number is the one that counts.

const DECIMAL = /^\d{1,7}(\.\d{1,3})?$/;
const MAX_QUANTITY = 9999;

/** What a person typed ("1,5", " 2 ") as a canonical decimal string ("1.5"). */
export function normalizeQuantity(text: string): string {
  return text.trim().replace(",", ".");
}

function toThousandths(quantity: string): number | null {
  if (!DECIMAL.test(quantity)) {
    return null;
  }
  const [whole, fraction = ""] = quantity.split(".");
  return Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
}

/** Why a quantity cannot be ordered; the component turns it into words. */
export type QuantityProblem = "invalid" | "tooMany" | "kgStep" | "wholeNumber";

export const MAX_ORDER_QUANTITY = MAX_QUANTITY;

/** Why a quantity cannot be ordered, or null when it can. */
export function quantityProblem(
  quantity: string,
  unit: string,
): QuantityProblem | null {
  const thousandths = toThousandths(quantity);
  if (thousandths === null) {
    return "invalid";
  }
  if (thousandths > MAX_QUANTITY * 1000) {
    return "tooMany";
  }
  if (unit === "kg") {
    return thousandths >= 100 && thousandths % 100 === 0 ? null : "kgStep";
  }
  return thousandths >= 1000 && thousandths % 1000 === 0
    ? null
    : "wholeNumber";
}

/** unit price × quantity, rounded half up to a whole dong. */
export function lineTotal(unitPrice: number, quantity: string): number {
  const thousandths = toThousandths(quantity);
  if (thousandths === null) {
    return 0;
  }
  return Math.floor((unitPrice * thousandths + 500) / 1000);
}
