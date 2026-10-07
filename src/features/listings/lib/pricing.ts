// Mirrors src/modules/listings/pricing.ts in the backend and is tested with
// the same table, so a total shown here equals the total the server charges.
// The server's number is the one that counts.

const DECIMAL = /^\d{1,7}(\.\d{1,3})?$/;

/** "1.5" -> 1500, or null for anything that is not a quantity. */
export function toThousandths(quantity: string): number | null {
  if (!DECIMAL.test(quantity)) {
    return null;
  }
  const [whole, fraction = ""] = quantity.split(".");
  return Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
}

function retailTotal(unitPrice: number, thousandths: number): number {
  return Math.floor((unitPrice * thousandths + 500) / 1000);
}

/** unit price × quantity, rounded half up to a whole dong; 0 when invalid. */
export function lineTotal(unitPrice: number, quantity: string): number {
  const thousandths = toThousandths(quantity);
  return thousandths === null ? 0 : retailTotal(unitPrice, thousandths);
}

/** A set quantity sold for a set price, e.g. 100 pieces for 900,000 VND. */
export interface Combo {
  quantity: string;
  price: number;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * The cheapest mix of combos and single units for `quantity`, as the server
 * computes it (dynamic programming over quantity steps). 0 when invalid.
 */
export function lineTotalWithCombos(
  unitPrice: number,
  combos: ReadonlyArray<Combo>,
  quantity: string,
): number {
  const total = toThousandths(quantity);
  if (total === null) {
    return 0;
  }
  const sizes = combos
    .map((combo) => ({ size: toThousandths(combo.quantity), price: combo.price }))
    .filter(
      (combo): combo is { size: number; price: number } =>
        combo.size !== null && combo.size > 0 && combo.size <= total,
    );
  if (sizes.length === 0 || total === 0) {
    return retailTotal(unitPrice, total);
  }
  const step = sizes.reduce((g, combo) => gcd(g, combo.size), total);
  const steps = total / step;
  const best = Array.from<number>({ length: steps + 1 });
  best[0] = 0;
  for (let i = 1; i <= steps; i += 1) {
    let cheapest = retailTotal(unitPrice, i * step);
    for (const combo of sizes) {
      const before = i - combo.size / step;
      if (before >= 0) {
        cheapest = Math.min(cheapest, best[before] + combo.price);
      }
    }
    best[i] = cheapest;
  }
  return best[steps];
}

/**
 * The next combo the buyer is close to (at least 80% of its quantity but not
 * there yet), to suggest buying a little more; null when there is none.
 */
export function nextCombo(
  combos: ReadonlyArray<Combo>,
  quantity: string,
): { combo: Combo; missing: number } | null {
  const have = toThousandths(quantity);
  if (have === null) {
    return null;
  }
  for (const combo of [...combos].sort(
    (a, b) => Number(a.quantity) - Number(b.quantity),
  )) {
    const size = toThousandths(combo.quantity);
    if (size !== null && have < size && have * 5 >= size * 4) {
      return { combo, missing: (size - have) / 1000 };
    }
  }
  return null;
}
