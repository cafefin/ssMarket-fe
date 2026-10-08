import { describe, expect, it } from "vitest";
import { addableQuantity, initialQuantity, normalizeQuantity } from "./purchase";

describe("addableQuantity", () => {
  it("is what is left after the cart's share of the stock", () => {
    expect(addableQuantity(5, 2)).toBe(3);
    expect(addableQuantity(1, 1)).toBe(0);
    expect(addableQuantity(2.5, 0.5)).toBe(2);
  });

  it("is never negative, even when the stock fell below the cart", () => {
    expect(addableQuantity(1, 3)).toBe(0);
  });

  it("is unlimited for a pre-order", () => {
    expect(addableQuantity(null, 9)).toBeNull();
  });
});

describe("initialQuantity", () => {
  it("starts at one step, or at what is left when that is less", () => {
    expect(initialQuantity("cái", null)).toBe("1");
    expect(initialQuantity("kg", 10)).toBe("0.5");
    expect(initialQuantity("kg", 0.3)).toBe("0.3");
  });
});

describe("normalizeQuantity", () => {
  it("accepts a decimal comma and refuses what is not a positive amount", () => {
    expect(normalizeQuantity(" 2,5 ")).toBe("2.5");
    expect(normalizeQuantity("0")).toBeNull();
    expect(normalizeQuantity("hai")).toBeNull();
    expect(normalizeQuantity("1.2345")).toBeNull();
  });
});
