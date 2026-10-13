/** Pieces go up by one; kg by half a kilo, a multiple of the 0.1 kg step. */
export function stepFor(unit: string): number {
  return unit === "kg" ? 0.5 : 1;
}

/**
 * A quantity to the thousandth, the finest the API keeps: rounds away the
 * floating-point noise of adding and subtracting decimal quantities.
 */
export function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}
