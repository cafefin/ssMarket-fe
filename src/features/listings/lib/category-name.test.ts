import { describe, expect, it } from "vitest";
import { categoryName } from "./category-name";

describe("categoryName", () => {
  const category = { name: "Thực phẩm tươi", nameEn: "Fresh food" };

  it("uses the Vietnamese name in Vietnamese", () => {
    expect(categoryName(category, "vi")).toBe("Thực phẩm tươi");
  });

  it("uses the English name in English", () => {
    expect(categoryName(category, "en")).toBe("Fresh food");
  });
});
