"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { Label } from "@/shared/ui/atoms/shadcn/label";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { userMessage } from "@/shared/api/api-error";
import { useListing } from "@/lib/api/use-listings";
import { type Order, useEditOrder } from "@/lib/api/use-orders";
import { formatMoney } from "@/shared/lib/format/money";
import {
  lineTotal,
  normalizeQuantity,
  quantityProblem,
} from "@/lib/orders/order-math";

/** Why a buyer cannot edit this order, or null when they can. */
export function editBlockedReason(order: Order, now: Date): string | null {
  if (
    order.viewerRole !== "buyer" ||
    !order.isPreorder ||
    order.fulfillmentStatus !== "pending"
  ) {
    return "hidden";
  }
  if (order.paymentStatus !== "unpaid") {
    return "Đơn đã báo chuyển khoản, hãy liên hệ người bán để thay đổi.";
  }
  if (
    order.listing.orderDeadline &&
    new Date(order.listing.orderDeadline).getTime() <= now.getTime()
  ) {
    return "Đã quá hạn chốt đơn nên không sửa được nữa.";
  }
  return null;
}

/**
 * Lets a buyer change the quantities of a pre-order. Items already in the
 * order are shown at the price they were ordered at; items added now use the
 * listing's current price. The server applies the same rule.
 */
export function OrderEditor({
  order,
  onDone,
}: {
  order: Order;
  onDone: () => void;
}) {
  const { data: listing, isPending, isError } = useListing(order.listing.id);
  const editOrder = useEditOrder();
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      order.lines.map((line) => [
        line.itemId,
        String(line.quantity).replace(".", ","),
      ]),
    ),
  );
  const [location, setLocation] = useState(order.deliveryLocation);
  const [note, setNote] = useState(order.note ?? "");
  const [showProblems, setShowProblems] = useState(false);

  if (isPending) {
    return <Skeleton className="h-40 w-full rounded-lg" aria-label="Đang tải" />;
  }
  if (isError || !listing) {
    return (
      <p role="alert" className="text-sm text-error-deep">
        Không tải được bài đăng để sửa đơn. Vui lòng thử lại.
      </p>
    );
  }

  // Ordered items first at their ordered price, then the rest of the listing.
  const ordered = order.lines.map((line) => ({
    id: line.itemId,
    name: line.itemName,
    unit: line.unit,
    unitPrice: line.unitPrice,
  }));
  const orderedIds = new Set(ordered.map((item) => item.id));
  const items = [
    ...ordered,
    ...listing.items
      .filter((item) => !orderedIds.has(item.id))
      .map(({ id, name, unit, unitPrice }) => ({ id, name, unit, unitPrice })),
  ];

  const lines = items.map((item) => {
    const quantity = normalizeQuantity(quantities[item.id] ?? "");
    const problem = quantity === "" ? null : quantityProblem(quantity, item.unit);
    return {
      item,
      quantity,
      problem,
      total: quantity !== "" && !problem ? lineTotal(item.unitPrice, quantity) : 0,
    };
  });
  const chosen = lines.filter((line) => line.quantity !== "");
  const total = lines.reduce((sum, line) => sum + line.total, 0);
  const locationMissing = location.trim() === "";

  async function save(): Promise<void> {
    setShowProblems(true);
    if (chosen.length === 0 || chosen.some((line) => line.problem) || locationMissing) {
      return;
    }
    try {
      await editOrder.mutateAsync({
        id: order.id,
        body: {
          lines: chosen.map((line) => ({
            itemId: line.item.id,
            quantity: line.quantity,
          })),
          paymentMethod: order.paymentMethod,
          deliveryLocation: location.trim(),
          note: note.trim() || null,
        },
      });
      toast.success("Đã cập nhật đơn");
      onDone();
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  return (
    <form
      noValidate
      aria-label="Sửa đơn"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="flex flex-col gap-4 rounded-lg border border-primary bg-primary-soft/40 p-4"
    >
      <h2 className="text-lg font-semibold">Sửa đơn</h2>
      <ul className="flex flex-col gap-3">
        {lines.map(({ item, problem }) => {
          const inputId = `edit-quantity-${item.id}`;
          return (
            <li key={item.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={inputId} className="min-w-0 flex-1 font-normal">
                  <span className="block truncate">{item.name}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    {formatMoney(item.unitPrice)}/{item.unit}
                  </span>
                </Label>
                <div className="flex shrink-0 items-center gap-2">
                  <Input
                    id={inputId}
                    inputMode={item.unit === "kg" ? "decimal" : "numeric"}
                    placeholder="0"
                    value={quantities[item.id] ?? ""}
                    aria-invalid={showProblems && Boolean(problem)}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    className="w-20 bg-background text-right"
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

      <div className="flex items-center justify-between border-t border-hairline-soft pt-3">
        <span className="text-sm text-muted-foreground">Tổng tiền mới</span>
        <output aria-label="Tổng tiền mới" className="text-lg font-semibold">
          {formatMoney(total)}
        </output>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="editDeliveryLocation">Giao đến</Label>
        <Input
          id="editDeliveryLocation"
          maxLength={120}
          value={location}
          aria-invalid={showProblems && locationMissing}
          onChange={(event) => setLocation(event.target.value)}
          className="bg-background"
        />
        {showProblems && locationMissing && (
          <p role="alert" className="text-[13px] text-error-deep">
            Nhập nơi nhận hàng
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="editNote">Ghi chú (không bắt buộc)</Label>
        <Input
          id="editNote"
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="bg-background"
        />
      </div>

      {showProblems && chosen.length === 0 && (
        <p role="alert" className="text-[13px] text-error-deep">
          Đơn cần ít nhất một mặt hàng. Muốn bỏ hết, hãy hủy đơn.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={editOrder.isPending}>
          {editOrder.isPending ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Thôi
        </Button>
      </div>
    </form>
  );
}
