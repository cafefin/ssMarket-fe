import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MESSAGES } from "@/shared/i18n/messages";
import type { CampaignDetail } from "../api/use-my-campaigns";
import {
  type CampaignFormValues,
  campaignSchema,
  emptyCampaign,
  emptyItem,
  fromCampaign,
  type ItemFormValues,
  MAX_ITEMS,
  toCampaignBody,
} from "./campaign-schema";

const item = (overrides: Partial<ItemFormValues> = {}): ItemFormValues => ({
  id: "",
  title: "Bánh bao chay",
  description: "",
  unit: "cái",
  unitPrice: "15.000",
  combos: [],
  selling: true,
  ...overrides,
});

const round = (overrides: Partial<CampaignFormValues> = {}): CampaignFormValues => ({
  title: "Bánh bao tuần này",
  categoryId: "2",
  description: "Giao tại sảnh",
  orderDeadline: "2026-10-09T17:00",
  deliveryDate: "2026-10-10",
  acceptsPrepaidQr: false,
  acceptsPayOnDelivery: true,
  defaultUnit: "cái",
  items: [item()],
  ...overrides,
});

const t = createTranslator({
  locale: "vi",
  messages: MESSAGES.vi,
  namespace: "sell.validation",
});

function problems(values: CampaignFormValues): Record<string, string> {
  const result = campaignSchema(t).safeParse(values);
  if (result.success) {
    return {};
  }
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("campaignSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-05T03:00:00Z") });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a valid round", () => {
    expect(problems(round())).toEqual({});
    expect(
      problems(
        round({
          items: [
            item({ title: "Xôi", combos: [{ quantity: "10", price: "120.000" }] }),
            item({ title: "Chè", unit: "hộp" }),
          ],
        }),
      ),
    ).toEqual({});
  });

  it.each<[string, CampaignFormValues, string, string]>([
    ["a short title", round({ title: " abc " }), "title", "Tên đợt gồm 5–120 ký tự"],
    ["a long title", round({ title: "a".repeat(121) }), "title", "Tên đợt gồm 5–120 ký tự"],
    ["no category", round({ categoryId: "" }), "categoryId", "Chọn loại hàng"],
    [
      "a long description",
      round({ description: "a".repeat(5001) }),
      "description",
      "Mô tả tối đa 5000 ký tự",
    ],
    [
      "no payment method",
      round({ acceptsPayOnDelivery: false }),
      "acceptsPayOnDelivery",
      "Chọn ít nhất một hình thức thanh toán",
    ],
    ["no deadline", round({ orderDeadline: "" }), "orderDeadline", "Chọn hạn chốt đơn"],
    [
      "a deadline in the past",
      round({ orderDeadline: "2026-10-01T17:00", deliveryDate: "2026-10-10" }),
      "orderDeadline",
      "Hạn chốt đơn phải ở tương lai",
    ],
    ["no delivery date", round({ deliveryDate: "" }), "deliveryDate", "Chọn ngày giao"],
    [
      "a delivery date before the deadline's date",
      round({ deliveryDate: "2026-10-08" }),
      "deliveryDate",
      "Ngày giao không được trước hạn chốt đơn",
    ],
    ["no products", round({ items: [] }), "items", "Thêm ít nhất một món"],
    [
      "too many products",
      round({ items: Array.from({ length: MAX_ITEMS + 1 }, () => item()) }),
      "items",
      "Mỗi đợt tối đa 50 món",
    ],
    [
      "a product title of one character",
      round({ items: [item({ title: " a " })] }),
      "items.0.title",
      "Tên món gồm 2–120 ký tự",
    ],
    [
      "a long product title",
      round({ items: [item({ title: "a".repeat(121) })] }),
      "items.0.title",
      "Tên món gồm 2–120 ký tự",
    ],
    [
      "an unknown unit",
      round({ items: [item({ unit: "thùng" })] }),
      "items.0.unit",
      "Chọn đơn vị",
    ],
    [
      "a price that is too low",
      round({ items: [item({ unitPrice: "999" })] }),
      "items.0.unitPrice",
      "Đơn giá từ 1.000 đ đến 1.000.000.000 đ",
    ],
    [
      "a price that is too high",
      round({ items: [item({ unitPrice: "1.000.000.001" })] }),
      "items.0.unitPrice",
      "Đơn giá từ 1.000 đ đến 1.000.000.000 đ",
    ],
    [
      "a price that is not a number",
      round({ items: [item({ unitPrice: "mười nghìn" })] }),
      "items.0.unitPrice",
      "Đơn giá từ 1.000 đ đến 1.000.000.000 đ",
    ],
    [
      "a long product description",
      round({ items: [item({ description: "a".repeat(5001) })] }),
      "items.0.description",
      "Mô tả tối đa 5000 ký tự",
    ],
    [
      "a combo of one unit",
      round({ items: [item({ combos: [{ quantity: "1", price: "10.000" }] })] }),
      "items.0.combos.0.quantity",
      "Số lượng combo phải lớn hơn 1 và chia hết cho bước bán (kg: bước 0,1)",
    ],
    [
      "a combo that is not cheaper",
      round({ items: [item({ combos: [{ quantity: "10", price: "150.000" }] })] }),
      "items.0.combos.0.price",
      "Giá combo từ 1.000 đ và rẻ hơn mua lẻ cùng số lượng",
    ],
  ])("rejects %s", (_name, values, path, message) => {
    expect(problems(values)).toEqual({ [path]: message });
  });

  it("points at the row that is wrong", () => {
    expect(
      problems(round({ items: [item(), item({ title: "" }), item({ unitPrice: "" })] })),
    ).toEqual({
      "items.1.title": "Tên món gồm 2–120 ký tự",
      "items.2.unitPrice": "Đơn giá từ 1.000 đ đến 1.000.000.000 đ",
    });
  });

  it("accepts a delivery on the day the round closes, and exactly 50 products", () => {
    expect(
      problems(
        round({
          deliveryDate: "2026-10-09",
          items: Array.from({ length: MAX_ITEMS }, () => item()),
        }),
      ),
    ).toEqual({});
  });
});

describe("emptyCampaign and emptyItem", () => {
  it("start a round with one empty product in the default unit", () => {
    expect(emptyItem("hộp")).toEqual({
      id: "",
      title: "",
      description: "",
      unit: "hộp",
      unitPrice: "",
      combos: [],
      selling: true,
    });
    const empty = emptyCampaign();
    expect(empty.items).toEqual([emptyItem("cái")]);
    expect(empty).toMatchObject({
      title: "",
      categoryId: "",
      defaultUnit: "cái",
      acceptsPayOnDelivery: true,
      acceptsPrepaidQr: false,
    });
  });
});

describe("toCampaignBody", () => {
  it("trims titles, parses prices, converts the deadline and leaves out form-only fields", () => {
    const body = toCampaignBody(
      round({
        title: "  Bánh bao tuần này ",
        items: [
          item({ title: " Bánh bao chay ", combos: [{ quantity: "10", price: "120.000" }] }),
          item({ id: "i2", title: "Chè", unit: "hộp", unitPrice: "20000", selling: false }),
        ],
      }),
    );

    expect(body).toEqual({
      title: "Bánh bao tuần này",
      categoryId: 2,
      description: "Giao tại sảnh",
      orderDeadline: new Date("2026-10-09T17:00").toISOString(),
      deliveryDate: "2026-10-10",
      acceptsPrepaidQr: false,
      acceptsPayOnDelivery: true,
      items: [
        {
          title: "Bánh bao chay",
          description: "",
          unit: "cái",
          unitPrice: 15000,
          combos: [{ quantity: "10", price: 120000 }],
          selling: true,
        },
        {
          id: "i2",
          title: "Chè",
          description: "",
          unit: "hộp",
          unitPrice: 20000,
          combos: [],
          selling: false,
        },
      ],
    });
    expect(body).not.toHaveProperty("defaultUnit");
    expect(body.items[0]).not.toHaveProperty("id");
  });
});

describe("fromCampaign", () => {
  const detail = {
    id: "c1",
    title: "Bánh bao tuần này",
    category: { id: 2, slug: "thuc-pham-tuoi", name: "Thực phẩm tươi", nameEn: "Fresh food", isPerishable: true },
    description: "Giao tại sảnh",
    orderDeadline: "2026-10-09T10:00:00.000Z",
    deliveryDate: "2026-10-10",
    acceptsPrepaidQr: true,
    acceptsPayOnDelivery: false,
    items: [
      {
        id: "i1",
        title: "Bánh bao chay",
        description: "Nhân nấm",
        unit: "hộp",
        unitPrice: 15000,
        combos: [{ quantity: "10", price: 120000 }],
        images: [],
        selling: true,
        orderCount: 0,
        removable: true,
      },
      {
        id: "i2",
        title: "Chè",
        description: "",
        unit: "cái",
        unitPrice: 20000,
        combos: [],
        images: [],
        selling: false,
        orderCount: 2,
        removable: false,
      },
    ],
  } as unknown as CampaignDetail;

  it("maps a round back to form values", () => {
    const values = fromCampaign(detail);

    expect(values).toEqual({
      title: "Bánh bao tuần này",
      categoryId: "2",
      description: "Giao tại sảnh",
      orderDeadline: expect.stringMatching(/^2026-10-(09|10)T\d{2}:00$/),
      deliveryDate: "2026-10-10",
      acceptsPrepaidQr: true,
      acceptsPayOnDelivery: false,
      defaultUnit: "hộp",
      items: [
        {
          id: "i1",
          title: "Bánh bao chay",
          description: "Nhân nấm",
          unit: "hộp",
          unitPrice: "15.000",
          combos: [{ quantity: "10", price: "120.000" }],
          selling: true,
        },
        {
          id: "i2",
          title: "Chè",
          description: "",
          unit: "cái",
          unitPrice: "20.000",
          combos: [],
          selling: false,
        },
      ],
    });
    // The deadline survives the round trip to the request body.
    expect(new Date(values.orderDeadline).toISOString()).toBe(
      "2026-10-09T10:00:00.000Z",
    );
  });

  it("writes prices the way English groups digits", () => {
    expect(fromCampaign(detail, "en").items[0].unitPrice).toBe("15,000");
  });
});
