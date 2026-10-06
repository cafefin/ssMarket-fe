import { describe, expect, it } from "vitest";
import { formatQuantity } from "./quantity";

describe("formatQuantity", () => {
  it("formats integers with Vietnamese thousands separator", () => {
    expect(formatQuantity(24)).toBe("24");
    expect(formatQuantity(1000)).toBe("1.000");
  });

  it("formats decimals with Vietnamese decimal separator", () => {
    expect(formatQuantity(2.5)).toBe("2,5");
    expect(formatQuantity(10.75)).toBe("10,75");
  });

  it("respects maximumFractionDigits of 3", () => {
    expect(formatQuantity(2.5555)).toBe("2,556");
  });
});
