"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, userMessage } from "@/lib/api/api-error";
import { useCurrentUser } from "@/lib/api/use-current-user";
import {
  type ListingDetail,
  LISTINGS_QUERY_KEY,
  listingQueryKey,
} from "@/lib/api/use-listings";
import { type PaymentMethod, usePlaceOrder } from "@/lib/api/use-orders";
import { formatMoney } from "@/lib/format/money";
import {
  formatQuantity,
  lineTotal,
  normalizeQuantity,
  quantityProblem,
} from "@/lib/orders/order-math";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "prepaid_qr", label: "Chuyển khoản trước qua mã QR" },
  { value: "pay_on_delivery", label: "Trả tiền khi nhận hàng" },
];

interface Shortage {
  itemId: string;
  name: string;
  available: number;
}

/** Quantities, payment method and delivery location for one order. */
export function OrderPanel({ listing }: { listing: ListingDetail }) {
  const router = useRouter();
  const { data: me } = useCurrentUser();
  const queryClient = useQueryClient();
  const placeOrder = usePlaceOrder();
  // One key for the life of this form: a double click or a retried request
  // reaches the server with the same key and creates a single order.
  const idempotencyKey = useRef(crypto.randomUUID());

  const accepted = METHODS.filter((method) =>
    method.value === "prepaid_qr"
      ? listing.acceptsPrepaidQr
      : listing.acceptsPayOnDelivery,
  );
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<PaymentMethod>(accepted[0].value);
  const [location, setLocation] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showProblems, setShowProblems] = useState(false);
  const [shortages, setShortages] = useState<Shortage[]>([]);
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);

  const deliveryLocation = location ?? me?.deliveryLocation ?? "";

  const lines = listing.items.map((item) => {
    const quantity = normalizeQuantity(quantities[item.id] ?? "");
    const soldOut = item.stockQuantity === 0;
    let problem: string | null = null;
    if (quantity !== "") {
      problem = quantityProblem(quantity, item.unit);
      if (
        !problem &&
        item.stockQuantity !== null &&
        Number(quantity) > item.stockQuantity
      ) {
        problem = `Chỉ còn ${formatQuantity(item.stockQuantity)} ${item.unit}`;
      }
    }
    return {
      item,
      quantity,
      soldOut,
      problem,
      total: quantity !== "" && !problem ? lineTotal(item.unitPrice, quantity) : 0,
    };
  });
  const chosen = lines.filter((line) => line.quantity !== "");
  const total = lines.reduce((sum, line) => sum + line.total, 0);
  const hasProblems = chosen.some((line) => line.problem);
  const locationMissing = deliveryLocation.trim() === "";

  async function submit(): Promise<void> {
    setShowProblems(true);
    setShortages([]);
    if (chosen.length === 0 || hasProblems || locationMissing) {
      return;
    }
    try {
      const order = await placeOrder.mutateAsync({
        idempotencyKey: idempotencyKey.current,
        body: {
          listingId: listing.id,
          lines: chosen.map((line) => ({
            itemId: line.item.id,
            quantity: line.quantity,
          })),
          paymentMethod: method,
          deliveryLocation: deliveryLocation.trim(),
          note: note.trim() || null,
        },
      });
      router.push(`/orders/${order.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "OUT_OF_STOCK") {
        setShortages((error.details.items as Shortage[] | undefined) ?? []);
        // Someone else bought in the meantime: show the real stock again.
        void queryClient.invalidateQueries({
          queryKey: listingQueryKey(listing.id),
        });
        // Cards in lists show stock too.
        void queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
      } else if (error instanceof ApiError && error.code === "ALREADY_ORDERED") {
        setExistingOrderId(String(error.details.orderId ?? ""));
      } else {
        toast.error(userMessage(error));
      }
    }
  }

  if (existingOrderId !== null) {
    return (
      <section className="rounded-lg border border-border bg-primary-soft p-4">
        <h2 className="font-semibold">Bạn đã đặt bài này</h2>
        <p className="mt-1 text-sm">
          Mỗi người có một đơn cho mỗi đợt đặt trước.{" "}
          <Link
            href={existingOrderId ? `/orders/${existingOrderId}` : "/orders"}
            className="font-medium text-primary underline"
          >
            Xem đơn của bạn
          </Link>
        </p>
      </section>
    );
  }

  return (
    <form
      noValidate
      aria-label="Đặt hàng"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-4 rounded-lg border border-border p-4"
    >
      <h2 className="text-lg font-semibold">Đặt hàng</h2>

      <ul className="flex flex-col gap-3">
        {lines.map(({ item, soldOut, problem }) => {
          const inputId = `quantity-${item.id}`;
          return (
            <li key={item.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={inputId} className="min-w-0 flex-1 font-normal">
                  <span className="block truncate">{item.name}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    {formatMoney(item.unitPrice)}/{item.unit}
                    {item.stockQuantity !== null &&
                      (soldOut
                        ? " · Hết hàng"
                        : ` · Còn ${formatQuantity(item.stockQuantity)}`)}
                  </span>
                </Label>
                <div className="flex shrink-0 items-center gap-2">
                  <Input
                    id={inputId}
                    inputMode={item.unit === "kg" ? "decimal" : "numeric"}
                    placeholder="0"
                    disabled={soldOut}
                    value={quantities[item.id] ?? ""}
                    aria-invalid={showProblems && Boolean(problem)}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    className="w-20 text-right"
                  />
                  <span className="w-8 text-sm text-muted-foreground">
                    {item.unit}
                  </span>
                </div>
              </div>
              {showProblems && problem && (
                <p role="alert" className="text-right text-[13px] text-error-deep">
                  {item.name}: {problem}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {shortages.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-error/40 bg-error-soft px-4 py-3 text-sm text-error-deep"
        >
          <p className="font-medium">Không còn đủ hàng:</p>
          <ul className="mt-1 list-disc pl-5">
            {shortages.map((shortage) => (
              <li key={shortage.itemId}>
                {shortage.name}: còn {formatQuantity(shortage.available)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-baseline justify-between border-t border-hairline-soft pt-3">
        <span className="text-sm text-muted-foreground">Tổng tiền</span>
        <output
          aria-label="Tổng tiền"
          className="font-heading text-4xl leading-tight font-bold"
        >
          {formatMoney(total)}
        </output>
      </div>

      {accepted.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Thanh toán</legend>
          {accepted.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="paymentMethod"
                className="size-4 accent-primary"
                checked={method === option.value}
                onChange={() => setMethod(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="text-sm">
          <span className="font-medium">Thanh toán:</span> {accepted[0].label}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="deliveryLocation">Giao đến</Label>
        <Input
          id="deliveryLocation"
          placeholder="Ví dụ: Tầng 7, khu A"
          maxLength={120}
          value={deliveryLocation}
          aria-invalid={showProblems && locationMissing}
          onChange={(event) => setLocation(event.target.value)}
        />
        {showProblems && locationMissing && (
          <p role="alert" className="text-[13px] text-error-deep">
            Nhập nơi nhận hàng
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="orderNote">Ghi chú (không bắt buộc)</Label>
        <Input
          id="orderNote"
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      {showProblems && chosen.length === 0 && (
        <p role="alert" className="text-[13px] text-error-deep">
          Nhập số lượng cho ít nhất một mặt hàng
        </p>
      )}

      <Button type="submit" disabled={placeOrder.isPending}>
        {placeOrder.isPending ? "Đang đặt…" : "Đặt hàng"}
      </Button>
    </form>
  );
}
