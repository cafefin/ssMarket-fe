import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MESSAGES } from "@/shared/i18n/messages";
import {
  emptyItem,
  imageProblem,
  type ListingFormValues,
  type ListingMode,
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
  orderDeadline: "",
  deliveryDate: "",
  items: [{ name: "Loa JBL", unit: "cái", unitPrice: "500.000", stockQuantity: "1" }],
  ...overrides,
});

const preorder = (overrides: Partial<ListingFormValues> = {}): ListingFormValues => ({
  ...inStock(),
  title: "Hoa quả tuần 41",
  categoryId: "2",
  orderDeadline: "2026-10-09T17:00",
  deliveryDate: "2026-10-12",
  items: [{ name: "Cam sành", unit: "kg", unitPrice: "35000", stockQuantity: "" }],
  ...overrides,
});

const t = createTranslator({
  locale: "vi",
  messages: MESSAGES.vi,
  namespace: "sell.validation",
});

function problems(mode: ListingMode, values: ListingFormValues): Record<string, string> {
  const result = listingSchema(mode, t).safeParse(values);
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

  it("accepts a valid listing in each mode", () => {
    expect(problems("in_stock", inStock())).toEqual({});
    expect(problems("preorder", preorder())).toEqual({});
  });

  it.each<[string, ListingMode, ListingFormValues, string, string]>([
    ["a short title", "in_stock", inStock({ title: " abc " }), "title", "Tiêu đề gồm 5–120 ký tự"],
    ["no category", "in_stock", inStock({ categoryId: "" }), "categoryId", "Chọn loại hàng"],
    [
      "a long description",
      "in_stock",
      inStock({ description: "a".repeat(5001) }),
      "description",
      "Mô tả tối đa 5000 ký tự",
    ],
    [
      "no payment method",
      "in_stock",
      inStock({ acceptsPayOnDelivery: false }),
      "acceptsPayOnDelivery",
      "Chọn ít nhất một hình thức thanh toán",
    ],
    ["no items", "in_stock", inStock({ items: [] }), "items", "Bài đăng cần 1–20 mặt hàng"],
    [
      "an empty item name",
      "in_stock",
      inStock({ items: [{ ...emptyItem(), unitPrice: "5000", stockQuantity: "1" }] }),
      "items.0.name",
      "Tên mặt hàng gồm 1–120 ký tự",
    ],
    [
      "a price that is not a number",
      "in_stock",
      inStock({ items: [{ name: "Loa", unit: "cái", unitPrice: "rẻ", stockQuantity: "1" }] }),
      "items.0.unitPrice",
      "Đơn giá từ 1.000 đ đến 1.000.000.000 đ",
    ],
    [
      "a price below 1.000",
      "in_stock",
      inStock({ items: [{ name: "Loa", unit: "cái", unitPrice: "999", stockQuantity: "1" }] }),
      "items.0.unitPrice",
      "Đơn giá từ 1.000 đ đến 1.000.000.000 đ",
    ],
    [
      "missing stock",
      "in_stock",
      inStock({ items: [{ name: "Loa", unit: "cái", unitPrice: "5000", stockQuantity: "" }] }),
      "items.0.stockQuantity",
      "Nhập số lượng lớn hơn 0",
    ],
    [
      "zero stock",
      "in_stock",
      inStock({ items: [{ name: "Loa", unit: "cái", unitPrice: "5000", stockQuantity: "0" }] }),
      "items.0.stockQuantity",
      "Nhập số lượng lớn hơn 0",
    ],
    [
      "fractional stock for a unit other than kg",
      "in_stock",
      inStock({ items: [{ name: "Bánh", unit: "hộp", unitPrice: "5000", stockQuantity: "1,5" }] }),
      "items.0.stockQuantity",
      "Chỉ đơn vị kg được nhập số lẻ",
    ],
    ["no deadline", "preorder", preorder({ orderDeadline: "" }), "orderDeadline", "Chọn hạn chốt đơn"],
    [
      "a deadline in the past",
      "preorder",
      preorder({ orderDeadline: "2026-10-01T17:00" }),
      "orderDeadline",
      "Hạn chốt đơn phải ở tương lai",
    ],
    ["no delivery date", "preorder", preorder({ deliveryDate: "" }), "deliveryDate", "Chọn ngày giao"],
    [
      "delivery before the deadline",
      "preorder",
      preorder({ deliveryDate: "2026-10-08" }),
      "deliveryDate",
      "Ngày giao không được trước hạn chốt đơn",
    ],
  ])("rejects %s", (_label, mode, values, path, message) => {
    expect(problems(mode, values)).toMatchObject({ [path]: message });
  });

  it("allows fractional kg stock and ignores stock and dates of the other mode", () => {
    expect(
      problems(
        "in_stock",
        inStock({
          orderDeadline: "garbage",
          items: [{ name: "Cam", unit: "kg", unitPrice: "35000", stockQuantity: "2,5" }],
        }),
      ),
    ).toEqual({});
    expect(
      problems(
        "preorder",
        preorder({
          items: [{ name: "Cam", unit: "kg", unitPrice: "35000", stockQuantity: "abc" }],
        }),
      ),
    ).toEqual({});
  });
});

describe("toListingBody", () => {
  it("builds an in-stock body without pre-order fields", () => {
    expect(
      toListingBody(
        "in_stock",
        inStock({ title: "  Loa bluetooth cũ ", orderDeadline: "2026-10-09T17:00" }),
      ),
    ).toEqual({
      mode: "in_stock",
      title: "Loa bluetooth cũ",
      categoryId: 4,
      description: "Còn mới",
      acceptsPrepaidQr: false,
      acceptsPayOnDelivery: true,
      orderDeadline: null,
      deliveryDate: null,
      items: [{ name: "Loa JBL", unit: "cái", unitPrice: 500000, stockQuantity: "1" }],
    });
  });

  it("builds a pre-order body with an absolute deadline and no stock", () => {
    const body = toListingBody(
      "preorder",
      preorder({
        items: [{ name: " Cam sành ", unit: "kg", unitPrice: "35.000", stockQuantity: "9" }],
      }),
    );

    expect(body.orderDeadline).toBe(new Date("2026-10-09T17:00").toISOString());
    expect(body.deliveryDate).toBe("2026-10-12");
    expect(body.items).toEqual([
      { name: "Cam sành", unit: "kg", unitPrice: 35000, stockQuantity: null },
    ]);
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
