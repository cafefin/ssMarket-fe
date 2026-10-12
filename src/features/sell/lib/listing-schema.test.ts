import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MESSAGES } from "@/shared/i18n/messages";
import {
  imageProblem,
  type ListingFormValues,
  listingSchema,
  parsePrice,
  parseQuantity,
  toListingBody,
} from "./listing-schema";

const inStock = (overrides: Partial<ListingFormValues> = {}): ListingFormValues => ({
  title: "Loa bluetooth cũ",
  categoryId: "4",
  description: "Còn mới",
  acceptsPrepaidQr: false,
  acceptsPayOnDelivery: true,
  condition: "good",
  unit: "cái",
  unitPrice: "500.000",
  stockQuantity: "1",
  combos: [],
  ...overrides,
});

const t = createTranslator({
  locale: "vi",
  messages: MESSAGES.vi,
  namespace: "sell.validation",
});

function problems(values: ListingFormValues): Record<string, string> {
  const result = listingSchema(t).safeParse(values);
  if (result.success) {
    return {};
  }
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("listingSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-05T03:00:00Z") });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a valid product in stock", () => {
    expect(problems(inStock())).toEqual({});
  });

  it.each<[string, ListingFormValues, string, string]>([
    ["a short title", inStock({ title: " abc " }), "title", "Tiêu đề gồm 5–120 ký tự"],
    ["no category", inStock({ categoryId: "" }), "categoryId", "Chọn loại hàng"],
    [
      "a long description",
      inStock({ description: "a".repeat(5001) }),
      "description",
      "Mô tả tối đa 5000 ký tự",
    ],
    [
      "no payment method",
      inStock({ acceptsPayOnDelivery: false }),
      "acceptsPayOnDelivery",
      "Chọn ít nhất một hình thức thanh toán",
    ],
    [
      "a price that is not a number",
      inStock({ unit: "cái", unitPrice: "rẻ", stockQuantity: "1" }),
      "unitPrice",
      "Đơn giá từ 1.000 đ đến 1.000.000.000 đ",
    ],
    [
      "a price below 1.000",
      inStock({ unit: "cái", unitPrice: "999", stockQuantity: "1" }),
      "unitPrice",
      "Đơn giá từ 1.000 đ đến 1.000.000.000 đ",
    ],
    [
      "missing stock",
      inStock({ unit: "cái", unitPrice: "5000", stockQuantity: "" }),
      "stockQuantity",
      "Nhập số lượng lớn hơn 0",
    ],
    [
      "zero stock",
      inStock({ unit: "cái", unitPrice: "5000", stockQuantity: "0" }),
      "stockQuantity",
      "Nhập số lượng lớn hơn 0",
    ],
    [
      "fractional stock for a unit other than kg",
      inStock({ unit: "hộp", unitPrice: "5000", stockQuantity: "1,5" }),
      "stockQuantity",
      "Chỉ đơn vị kg được nhập số lẻ",
    ],
  ])("rejects %s", (_label, values, path, message) => {
    expect(problems(values)).toMatchObject({ [path]: message });
  });

  it("allows fractional kg stock and ignores fields of an old draft", () => {
    expect(
      problems({
        ...inStock({
          categoryId: "2",
          unit: "kg",
          unitPrice: "35000",
          stockQuantity: "2,5",
        }),
        ...({ orderDeadline: "garbage" } as object),
      }),
    ).toEqual({});
  });
});

describe("toListingBody", () => {
  it("always builds an in-stock body, without pre-order fields", () => {
    expect(toListingBody(inStock({ title: "  Loa bluetooth cũ " }))).toEqual({
      mode: "in_stock",
      title: "Loa bluetooth cũ",
      categoryId: 4,
      description: "Còn mới",
      acceptsPrepaidQr: false,
      acceptsPayOnDelivery: true,
      condition: "good",
      unit: "cái",
      unitPrice: 500000,
      stockQuantity: "1",
      combos: [],
    });
  });
});

describe("parsers", () => {
  it.each([
    ["35000", 35000],
    ["35.000", 35000],
    ["1,250,000", 1250000],
    [" 5 000 ", 5000],
  ])("parsePrice(%j) = %d", (text, expected) => {
    expect(parsePrice(text)).toBe(expected);
  });

  it.each(["", "abc", "35k", "-5000", "3.5e3"])("parsePrice(%j) is NaN", (text) => {
    expect(parsePrice(text)).toBeNaN();
  });

  it.each([
    ["2", "2"],
    ["2.5", "2.5"],
    ["2,5", "2.5"],
    [" 0.125 ", "0.125"],
  ])("parseQuantity(%j) = %j", (text, expected) => {
    expect(parseQuantity(text)).toBe(expected);
  });

  it.each(["", "abc", "1.2345", "-1", "1.", "12345678"])(
    "parseQuantity(%j) is null",
    (text) => {
      expect(parseQuantity(text)).toBeNull();
    },
  );
});

describe("condition and combos", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-05T03:00:00Z") });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  const food = (categoryId: string) => categoryId === "2";

  it("asks for a condition outside food and never sends one for food", () => {
    expect(problems(inStock({ condition: "" }))).toMatchObject({
      condition: "Chọn độ mới",
    });
    expect(
      listingSchema(t, food).safeParse(
        inStock({ categoryId: "2", condition: "" }),
      ).success,
    ).toBe(true);
    expect(toListingBody(inStock()).condition).toBe("good");
    expect(
      toListingBody(inStock({ categoryId: "2" }), food).condition,
    ).toBeNull();
  });

  it("checks combos and sends them as numbers", () => {
    const withCombos = (combos: { quantity: string; price: string }[]) =>
      inStock({ unitPrice: "10.000", stockQuantity: "500", combos });
    expect(problems(withCombos([{ quantity: "100", price: "900.000" }]))).toEqual({});
    expect(
      toListingBody(withCombos([{ quantity: "100", price: "900.000" }])).combos,
    ).toEqual([{ quantity: "100", price: 900000 }]);
    expect(problems(withCombos([{ quantity: "1", price: "9.000" }]))).toMatchObject({
      "combos.0.quantity": "Số lượng combo phải lớn hơn 1 và chia hết cho bước bán (kg: bước 0,1)",
    });
    expect(problems(withCombos([{ quantity: "10", price: "100.000" }]))).toMatchObject({
      "combos.0.price": "Giá combo từ 1.000 đ và rẻ hơn mua lẻ cùng số lượng",
    });
    expect(
      problems(
        withCombos([
          { quantity: "10", price: "90.000" },
          { quantity: "10", price: "80.000" },
        ]),
      ),
    ).toMatchObject({ "combos.1.quantity": "Đã có combo với số lượng này" });
    const four = [2, 3, 4, 5].map((n) => ({ quantity: String(n), price: String(n * 9000) }));
    expect(problems(withCombos(four))).toMatchObject({ combos: "Tối đa 3 combo" });
  });
});

describe("imageProblem", () => {
  it("accepts JPEG, PNG and WebP up to 5 MB", () => {
    expect(imageProblem({ type: "image/jpeg", size: 5 * 1024 * 1024 })).toBeNull();
    expect(imageProblem({ type: "image/png", size: 10 })).toBeNull();
    expect(imageProblem({ type: "image/webp", size: 10 })).toBeNull();
  });

  it("rejects other types and larger files", () => {
    expect(imageProblem({ type: "image/gif", size: 10 })).toBe("INVALID_IMAGE");
    expect(imageProblem({ type: "application/pdf", size: 10 })).not.toBeNull();
    expect(imageProblem({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).toBe(
      "PAYLOAD_TOO_LARGE",
    );
  });
});
