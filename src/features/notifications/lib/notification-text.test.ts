import { describe, expect, it } from "vitest";
import { type Notification, notificationText } from "./notification-text";

const params = (overrides: Record<string, unknown> = {}) =>
  ({
    orderId: "o1",
    orderCode: "SSM2ABCDE",
    buyerName: "An",
    sellerName: "Bình",
    title: "Bánh",
    total: 120000,
    role: "seller",
    actor: "buyer",
    reason: null,
    ...overrides,
  }) as unknown as Notification["params"];

const of = (type: string, overrides: Record<string, unknown> = {}) =>
  notificationText({
    type: type as Notification["type"],
    params: params(overrides),
  });

describe("notificationText", () => {
  it.each([
    ["order.placed", "orderPlaced"],
    ["order.edited", "orderEdited"],
    ["order.payment_reported", "orderPaymentReported"],
    ["order.payment_confirmed", "orderPaymentConfirmed"],
    ["order.payment_rejected", "orderPaymentRejected"],
    ["order.delivered", "orderDelivered"],
  ])("maps %s to %s and links to the order", (type, key) => {
    const text = of(type);
    expect(text.key).toBe(key);
    expect(text.href).toBe("/orders/o1");
    expect(text.values).toEqual({
      buyerName: "An",
      sellerName: "Bình",
      orderCode: "SSM2ABCDE",
      title: "Bánh",
      total: 120000,
      reason: "",
    });
  });

  it("tells who cancelled", () => {
    expect(of("order.cancelled", { actor: "buyer" }).key).toBe("orderCancelledByBuyer");
    const bySeller = of("order.cancelled", { actor: "seller", reason: "Hết hàng" });
    expect(bySeller.key).toBe("orderCancelledBySeller");
    expect(bySeller.values.reason).toBe("Hết hàng");
  });

  it("falls back for an unknown type", () => {
    expect(of("campaign.opened")).toMatchObject({ key: "unknown", href: null });
  });

  it("falls back when the order is not named or fields have the wrong type", () => {
    expect(of("order.placed", { orderId: undefined })).toMatchObject({ key: "unknown", href: null });
    expect(of("order.placed", { orderCode: undefined })).toMatchObject({ key: "unknown", href: null });
    expect(of("order.placed", { orderId: 5 })).toMatchObject({ key: "unknown", href: null });
    expect(of("order.placed", { orderCode: 7 })).toMatchObject({ key: "unknown", href: null });
  });

  it("defaults missing optional strings and a non-number total", () => {
    const text = of("order.placed", { reason: undefined, title: undefined, total: "12" });
    expect(text.values.reason).toBe("");
    expect(text.values.title).toBe("");
    expect(text.values.total).toBe(0);
  });
});
