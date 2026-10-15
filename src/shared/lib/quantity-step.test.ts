import { describe, expect, it } from "vitest";
import { roundQuantity, stepFor } from "./quantity-step";

describe("stepFor", () => {
  it("steps kilograms by half a kilo and everything else by one", () => {
    expect(stepFor("kg")).toBe(0.5);
    expect(stepFor("cái")).toBe(1);
  });
});

describe("roundQuantity", () => {
  it.each([
    [0.1 + 0.2, 0.3],
    [1.1 + 2.2, 3.3],
    [2.5 - 0.1, 2.4],
    [1.0006, 1.001],
    [3, 3],
    [0, 0],
  ])("rounds %d to %d, a quantity in thousandths", (value, rounded) => {
    expect(roundQuantity(value)).toBe(rounded);
  });
});
