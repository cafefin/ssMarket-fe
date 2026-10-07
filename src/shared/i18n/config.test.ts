import { describe, expect, it } from "vitest";
import { isLocale, resolveLocale } from "./config";

describe("resolveLocale", () => {
  it.each([
    ["vi", "vi"],
    ["en", "en"],
    ["fr", "vi"],
    ["EN", "vi"],
    ["", "vi"],
    [undefined, "vi"],
  ])("%j -> %s", (value, expected) => {
    expect(resolveLocale(value)).toBe(expected);
  });

  it("recognises only the supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale(42)).toBe(false);
  });
});
