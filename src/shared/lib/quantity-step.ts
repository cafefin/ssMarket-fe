/** Pieces go up by one; kg by half a kilo, a multiple of the 0.1 kg step. */
export function stepFor(unit: string): number {
  return unit === "kg" ? 0.5 : 1;
}
