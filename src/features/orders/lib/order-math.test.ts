import { describe, expect, it } from "vitest";
import {
  lineTotal,
  normalizeQuantity,
  quantityProblem,
} from "./order-math";

describe("lineTotal (same table as the backend)", () => {
  it.each([
    [35000, "2", 70000],
    [35000, "1.5", 52500],
    [33333, "0.1", 3333],
    [33335, "0.1", 3334],
    [1000, "0.001", 1],
    [1499, "0.001", 1],
    [1500, "0.001", 2],
    [1000000000, "9999", 9999000000000],
  ])("%d × %s = %d", (unitPrice, quantity, expected) => {
    expect(lineTotal(unitPrice, quantity)).toBe(expected);
  });

  it("is 0 for something that is not a quantity", () => {
    expect(lineTotal(35000, "")).toBe(0);
    expect(lineTotal(35000, "abc")).toBe(0);
  });
});

describe("quantityProblem", () => {
  it.each(["0.1", "1.5", "12", "9999"])("kg accepts %j", (quantity) => {
    expect(quantityProblem(quantity, "kg")).toBeNull();
  });

  it.each(["0", "0.05", "1.25", "10000", "abc", "-1"])("kg rejects %j", (q) => {
    expect(quantityProblem(q, "kg")).not.toBeNull();
  });

  it.each(["1", "25", "9999"])("cái accepts %j", (quantity) => {
    expect(quantityProblem(quantity, "cái")).toBeNull();
  });

  it.each(["0", "1.5", "0.5", "10000", ""])("cái rejects %j", (quantity) => {
    expect(quantityProblem(quantity, "cái")).not.toBeNull();
  });

  it("explains the step for kg and the whole-number rule for other units", () => {
    expect(quantityProblem("1.25", "kg")).toBe("kgStep");
    expect(quantityProblem("1.5", "hộp")).toBe("wholeNumber");
    expect(quantityProblem("abc", "hộp")).toBe("invalid");
    expect(quantityProblem("10000", "hộp")).toBe("tooMany");
  });
});

describe("formatting", () => {
  it("accepts a comma as the decimal separator", () => {
    expect(normalizeQuantity(" 1,5 ")).toBe("1.5");
    expect(normalizeQuantity("2")).toBe("2");
  });
});
