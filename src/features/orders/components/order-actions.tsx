"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/atoms/shadcn/alert-dialog";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Label } from "@/shared/ui/atoms/shadcn/label";
import { Textarea } from "@/shared/ui/atoms/shadcn/textarea";
import { userMessage } from "@/shared/api/api-error";
import {
  type Order,
  type OrderAction,
  useOrderAction,
} from "../api/use-orders";

const DONE: Record<OrderAction, string> = {
  "report-payment": "Đã báo cho người bán",
  "confirm-payment": "Đã xác nhận nhận tiền",
  "reject-payment": "Đã chuyển đơn về chưa thanh toán",
  deliver: "Đã đánh dấu đã giao",
  cancel: "Đã hủy đơn",
};

/** Which actions the viewer may take on an order in its current state. */
export function availableActions(order: Order): OrderAction[] {
  if (order.fulfillmentStatus === "cancelled") {
    return [];
  }
  const pending = order.fulfillmentStatus === "pending";
  const actions: OrderAction[] = [];

  if (order.viewerRole === "buyer") {
    if (order.paymentStatus === "unpaid") {
      if (order.paymentMethod === "prepaid_qr") {
        actions.push("report-payment");
      }
      if (pending) {
        actions.push("cancel");
      }
    }
    return actions;
  }

  if (order.paymentStatus !== "paid") {
    actions.push("confirm-payment");
  }
  if (order.paymentStatus === "reported") {
    actions.push("reject-payment");
  }
  if (pending) {
    actions.push("deliver", "cancel");
  }
  return actions;
}

/** The buttons for an order, with confirmation for the ones that undo things. */
export function OrderActions({
  order,
  compact = false,
}: {
  order: Order;
  /** In lists: only the two everyday seller actions, as small buttons. */
  compact?: boolean;
}) {
  const action = useOrderAction();
  const [confirming, setConfirming] = useState<"cancel" | "reject-payment" | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [reasonMissing, setReasonMissing] = useState(false);

  const isSeller = order.viewerRole === "seller";
  let actions = availableActions(order);
  if (compact) {
    actions = actions.filter((a) => a === "confirm-payment" || a === "deliver");
  }

  async function run(name: OrderAction, cancelReason?: string): Promise<void> {
    try {
      await action.mutateAsync({ id: order.id, action: name, reason: cancelReason });
      toast.success(DONE[name]);
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  function closeDialog(): void {
    setConfirming(null);
    setReason("");
    setReasonMissing(false);
  }

  if (actions.length === 0) {
    return null;
  }
  const size = compact ? "sm" : "default";
  const busy = action.isPending;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.includes("report-payment") && (
        <Button size={size} disabled={busy} onClick={() => void run("report-payment")}>
          Tôi đã chuyển khoản
        </Button>
      )}
      {actions.includes("confirm-payment") && (
        <Button
          size={size}
          variant={compact ? "outline" : "default"}
          disabled={busy}
          onClick={() => void run("confirm-payment")}
        >
          Đã nhận tiền
        </Button>
      )}
      {actions.includes("deliver") && (
        <Button
          size={size}
          variant="outline"
          disabled={busy}
          onClick={() => void run("deliver")}
        >
          Đã giao
        </Button>
      )}
      {actions.includes("reject-payment") && (
        <Button
          size={size}
          variant="outline"
          disabled={busy}
          onClick={() => setConfirming("reject-payment")}
        >
          Chưa nhận được
        </Button>
      )}
      {actions.includes("cancel") && (
        <Button
          size={size}
          variant="ghost"
          disabled={busy}
          onClick={() => setConfirming("cancel")}
        >
          Hủy đơn
        </Button>
      )}

      <AlertDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming === "cancel"
                ? `Hủy đơn ${order.code}?`
                : "Chưa nhận được tiền?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirming === "cancel"
                ? isSeller
                  ? "Người mua sẽ thấy lý do bạn ghi. Nếu họ đã chuyển khoản, bạn cần tự hoàn tiền cho họ."
                  : "Đơn đã hủy không khôi phục được. Bạn có thể đặt lại sau."
                : "Đơn sẽ trở về trạng thái chưa thanh toán để người mua kiểm tra lại."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirming === "cancel" && isSeller && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="cancelReason">Lý do hủy</Label>
              <Textarea
                id="cancelReason"
                rows={2}
                maxLength={300}
                value={reason}
                aria-invalid={reasonMissing}
                onChange={(event) => setReason(event.target.value)}
              />
              {reasonMissing && (
                <p role="alert" className="text-[13px] text-error-deep">
                  Nhập lý do để người mua biết
                </p>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirming === "cancel" && isSeller && reason.trim() === "") {
                  setReasonMissing(true);
                  return;
                }
                if (confirming) {
                  void run(confirming, reason.trim() || undefined);
                }
                closeDialog();
              }}
            >
              {confirming === "cancel" ? "Hủy đơn" : "Xác nhận"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
