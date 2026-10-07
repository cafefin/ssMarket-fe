import { describe, expect, it } from "vitest";
import { lineTotal, lineTotalWithCombos, nextCombo } from "./pricing";

// The same table as src/modules/orders/order-rules.spec.ts in the backend.
describe("lineTotalWithCombos (same table as the backend)", () => {
  const hundred = [{ quantity: "100", price: 900_000 }];
  const smallAndLarge = [
    { quantity: "3", price: 25_000 },
    { quantity: "5", price: 40_000 },
  ];

  it.each<[string, number, { quantity: string; price: number }[], string, number]>([
    ["no combo", 10_000, [], "7", 70_000],
    ["one piece", 10_000, hundred, "1", 10_000],
    ["just below the combo", 10_000, hundred, "99", 990_000],
    ["exactly the combo", 10_000, hundred, "100", 900_000],
    ["two combos and some singles", 10_000, hundred, "230", 2_100_000],
    ["two small combos beat one large", 10_000, smallAndLarge, "6", 50_000],
    ["mixing combo sizes", 10_000, smallAndLarge, "8", 65_000],
    ["three small combos", 10_000, smallAndLarge, "9", 75_000],
    ["two large combos", 10_000, smallAndLarge, "10", 80_000],
    ["kg with a fractional rest", 35_000, [{ quantity: "1", price: 30_000 }], "2.5", 77_500],
    ["a combo dearer than singles is ignored", 1_000, [{ quantity: "2", price: 5_000 }], "2", 2_000],
  ])("%s", (_label, unitPrice, combos, quantity, expected) => {
    expect(lineTotalWithCombos(unitPrice, combos, quantity)).toBe(expected);
  });

  it("is 0 for something that is not a quantity", () => {
    expect(lineTotalWithCombos(10_000, hundred, "abc")).toBe(0);
    expect(lineTotal(10_000, "")).toBe(0);
  });
});

describe("nextCombo", () => {
  const combos = [
    { quantity: "10", price: 90_000 },
    { quantity: "100", price: 800_000 },
  ];

  it("suggests the combo the buyer is close to", () => {
    expect(nextCombo(combos, "8")).toEqual({ combo: combos[0], missing: 2 });
    expect(nextCombo(combos, "85")).toEqual({ combo: combos[1], missing: 15 });
  });

  it("says nothing when far from a combo, past it, or for no quantity", () => {
    expect(nextCombo(combos, "5")).toBeNull();
    expect(nextCombo(combos, "10")).toBeNull();
    expect(nextCombo(combos, "x")).toBeNull();
  });
});
