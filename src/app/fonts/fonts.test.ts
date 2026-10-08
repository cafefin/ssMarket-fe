import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "src/app/fonts");
const css = readFileSync(join(dir, "fonts.css"), "utf8");

describe("self-hosted fonts", () => {
  it("points every @font-face at a file in this folder", () => {
    const files = [...css.matchAll(/url\(\.\/([^)]+)\)/g)].map((m) => m[1]);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) expect(existsSync(join(dir, file))).toBe(true);
  });

  it("covers Vietnamese letters with Nunito", () => {
    expect(css).toContain("nunito-vietnamese-wght-normal.woff2");
    expect(css).toContain("nunito-latin-ext-wght-normal.woff2");
  });

  it("is what the root layout loads instead of Google Fonts", () => {
    const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).toContain('import "./fonts/fonts.css"');
    expect(layout).not.toContain("next/font/google");
  });
});
