import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/shared/i18n/messages";
import { checkProduct, MAX_COMBOS, parsePrice, parseQuantity } from "./product-rules";

const t = createTranslator({
  locale: "vi",
  messages: MESSAGES.vi,
  namespace: "sell.validation",
});

function problems(value: Parameters<typeof checkProduct>[0]): Record<string, string> {
  const found: Record<string, string> = {};
  checkProduct(value, (path, message) => (found[path.join(".")] = message), t);
  return found;
}

const product = (overrides: Partial<Parameters<typeof checkProduct>[0]> = {}) => ({
  unit: "cái",
  unitPrice: "10.000",
  combos: [],
  ...overrides,
});

describe("checkProduct", () => {
  it("accepts a product with a valid unit, price and combo", () => {
    expect(problems(product())).toEqual({});
    expect(
      problems(product({ combos: [{ quantity: "100", price: "900.000" }] })),
    ).toEqual({});
    expect(
      problems(product({ unit: "kg", combos: [{ quantity: "2,5", price: "20.000" }] })),
    ).toEqual({});
  });

  it("reports an unknown unit and a price out of range", () => {
    expect(problems(product({ unit: "thùng", unitPrice: "999" }))).toEqual({
      unit: "Chọn đơn vị",
      unitPrice: "Đơn giá từ 1.000 đ đến 1.000.000.000 đ",
    });
  });

  it("reports combo problems at the combo's own path", () => {
    expect(
      problems(
        product({
          combos: [
            { quantity: "10", price: "90.000" },
            { quantity: "10", price: "80.000" },
            { quantity: "1", price: "9.000" },
            { quantity: "20", price: "200.000" },
          ],
        }),
      ),
    ).toEqual({
      combos: "Tối đa 3 combo",
      "combos.1.quantity": "Đã có combo với số lượng này",
      "combos.2.quantity":
        "Số lượng combo phải lớn hơn 1 và chia hết cho bước bán (kg: bước 0,1)",
      "combos.3.price": "Giá combo từ 1.000 đ và rẻ hơn mua lẻ cùng số lượng",
    });
    expect(MAX_COMBOS).toBe(3);
  });

  it("shares the parsers with the listing form", () => {
    expect(parsePrice("35.000")).toBe(35000);
    expect(parseQuantity("2,5")).toBe("2.5");
  });
});
