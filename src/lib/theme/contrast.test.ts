import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, readCssColorTokens } from "./contrast";

const tokens = readCssColorTokens(
  readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8"),
);

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for identical colours", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#2B62B2", "#2b62b2")).toBe(1);
  });

  it("does not depend on argument order", () => {
    expect(contrastRatio("#2B62B2", "#ffffff")).toBe(
      contrastRatio("#ffffff", "#2B62B2"),
    );
  });
});

describe("readCssColorTokens", () => {
  it("reads hex custom properties and ignores everything else", () => {
    expect(
      readCssColorTokens(":root { --a: #FFF000; --b: var(--a); --r: 12px; }"),
    ).toEqual({ a: "#FFF000" });
  });
});

describe("theme palette", () => {
  it("uses the SmartOSC brand colours", () => {
    expect(tokens.primary?.toUpperCase()).toBe("#2B62B2");
    expect(tokens.positive?.toUpperCase()).toBe("#4CAF4D");
  });

  // [text token, background token]: every pairing components are allowed to use.
  it.each([
    ["primary-foreground", "primary"],
    ["primary-foreground", "primary-deep"],
    ["primary", "background"],
    ["primary", "primary-soft"],
    ["foreground", "background"],
    ["foreground", "positive"],
    ["muted-foreground", "background"],
    ["muted-foreground", "surface-soft"],
    ["positive-deep", "background"],
    ["positive-deep", "positive-soft"],
    ["warn-deep", "warn-soft"],
    ["error-deep", "background"],
    ["error-deep", "error-soft"],
    ["destructive", "background"],
  ])("%s on %s meets WCAG AA for body text", (text, background) => {
    expect(tokens[text], `missing token --${text}`).toBeDefined();
    expect(tokens[background], `missing token --${background}`).toBeDefined();
    expect(
      contrastRatio(tokens[text], tokens[background]),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("never puts white text on the brand green", () => {
    expect(contrastRatio("#ffffff", tokens.positive)).toBeLessThan(4.5);
  });

  it("keeps the old mint accent out of the palette", () => {
    expect(
      Object.values(tokens).map((value) => value.toLowerCase()),
    ).not.toContain("#00d4a4");
  });
});
