import type {
  FulfillmentStatus,
  Order,
  PaymentStatus,
} from "@/lib/api/use-orders";
import { cn } from "@/shared/lib/utils";

type Tone = "positive" | "info" | "warn" | "error";

const TONES: Record<Tone, string> = {
  positive: "bg-positive-soft text-positive-deep",
  info: "bg-primary-soft text-primary",
  warn: "bg-warn-soft text-warn-deep",
  error: "bg-error-soft text-error-deep",
};

const PAYMENT: Record<PaymentStatus, { label: string; tone: Tone }> = {
  unpaid: { label: "Chưa thanh toán", tone: "warn" },
  reported: { label: "Chờ xác nhận tiền", tone: "info" },
  paid: { label: "Đã thanh toán", tone: "positive" },
};

const FULFILLMENT: Record<FulfillmentStatus, { label: string; tone: Tone }> = {
  pending: { label: "Chờ giao", tone: "warn" },
  delivered: { label: "Đã giao", tone: "positive" },
  cancelled: { label: "Đã hủy", tone: "error" },
};

function Badge({ tone, children }: { tone: Tone; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-semibold whitespace-nowrap",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/**
 * The state of an order as text badges. A cancelled order shows only that
 * (plus a refund notice), since its payment state no longer matters.
 */
export function OrderStatusBadges({
  order,
}: {
  order: Pick<Order, "paymentStatus" | "fulfillmentStatus" | "refundNeeded">;
}) {
  const cancelled = order.fulfillmentStatus === "cancelled";
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {!cancelled && (
        <Badge tone={PAYMENT[order.paymentStatus].tone}>
          {PAYMENT[order.paymentStatus].label}
        </Badge>
      )}
      <Badge tone={FULFILLMENT[order.fulfillmentStatus].tone}>
        {FULFILLMENT[order.fulfillmentStatus].label}
      </Badge>
      {order.refundNeeded && <Badge tone="error">Cần hoàn tiền</Badge>}
    </span>
  );
}
