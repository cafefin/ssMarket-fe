import { describe, expect, it } from "vitest";
import { formatUnit } from "./unit";

describe("formatUnit", () => {
  it.each(["cái", "kg", "hộp", "túi", "chai", "bó", "combo"])(
    "keeps %s as written in Vietnamese",
    (unit) => {
      expect(formatUnit(unit, "vi", 2)).toBe(unit);
    },
  );

  it.each([
    ["cái", 1, "piece"],
    ["cái", 2, "pieces"],
    ["kg", 0.5, "kg"],
    ["hộp", 3, "boxes"],
    ["túi", 1, "bag"],
    ["chai", 2, "bottles"],
    ["bó", 2, "bunches"],
    ["combo", 2, "combos"],
  ])("%s × %d -> %s in English", (unit, count, expected) => {
    expect(formatUnit(unit, "en", count)).toBe(expected);
  });

  it("uses the singular when no count is given", () => {
    expect(formatUnit("cái", "en")).toBe("piece");
  });

  it("shows an unknown unit as written", () => {
    expect(formatUnit("thùng", "en", 2)).toBe("thùng");
  });
});
