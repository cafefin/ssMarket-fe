import { describe, expect, it } from "vitest";
import { formatQuantity } from "./quantity";

describe("formatQuantity", () => {
  it("formats integers with the thousands separator of the language", () => {
    expect(formatQuantity(24, "vi")).toBe("24");
    expect(formatQuantity(1000, "vi")).toBe("1.000");
    expect(formatQuantity(1000, "en")).toBe("1,000");
  });

  it("formats decimals with the decimal separator of the language", () => {
    expect(formatQuantity(2.5, "vi")).toBe("2,5");
    expect(formatQuantity(10.75, "vi")).toBe("10,75");
    expect(formatQuantity(2.5, "en")).toBe("2.5");
  });

  it("respects maximumFractionDigits of 3", () => {
    expect(formatQuantity(2.5555, "vi")).toBe("2,556");
  });
});
