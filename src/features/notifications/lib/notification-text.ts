import type { components } from "@/shared/api/schema";

export type Notification = components["schemas"]["NotificationDto"];

export type NotificationTextKey =
  | "orderPlaced"
  | "orderEdited"
  | "orderPaymentReported"
  | "orderPaymentConfirmed"
  | "orderPaymentRejected"
  | "orderDelivered"
  | "orderCancelledByBuyer"
  | "orderCancelledBySeller"
  | "unknown";

export interface NotificationText {
  key: NotificationTextKey;
  /** ICU values; `total` is a number the component formats as money. */
  values: {
    buyerName: string;
    sellerName: string;
    orderCode: string;
    title: string;
    total: number;
    reason: string;
  };
  /** Where a click goes; null when the params do not name an order. */
  href: string | null;
}

const KEYS: Record<string, NotificationTextKey> = {
  "order.placed": "orderPlaced",
  "order.edited": "orderEdited",
  "order.payment_reported": "orderPaymentReported",
  "order.payment_confirmed": "orderPaymentConfirmed",
  "order.payment_rejected": "orderPaymentRejected",
  "order.delivered": "orderDelivered",
};

const text = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * Turns a notification into a message key, its values and a link. The server
 * may be newer than this app, so unknown types and incomplete params give the
 * generic "unknown" text and no link instead of failing.
 */
export function notificationText({
  type,
  params,
}: Pick<Notification, "type" | "params">): NotificationText {
  const p = (params ?? {}) as unknown as Record<string, unknown>;
  const values = {
    buyerName: text(p.buyerName),
    sellerName: text(p.sellerName),
    orderCode: text(p.orderCode),
    title: text(p.title),
    total: typeof p.total === "number" ? p.total : 0,
    reason: text(p.reason),
  };
  const orderId = text(p.orderId);
  const key: NotificationTextKey | undefined =
    type === "order.cancelled"
      ? p.actor === "buyer"
        ? "orderCancelledByBuyer"
        : "orderCancelledBySeller"
      : Object.hasOwn(KEYS, type)
        ? KEYS[type]
        : undefined;
  if (!key || !orderId || !values.orderCode) {
    return { key: "unknown", values, href: null };
  }
  return { key, values, href: `/orders/${orderId}` };
}
