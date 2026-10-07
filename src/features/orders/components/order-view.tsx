"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { ApiError } from "@/shared/api/api-error";
import { type Order, useOrder } from "../api/use-orders";
import { formatDate, formatDateTime } from "@/shared/lib/format/datetime";
import { formatMoney } from "@/shared/lib/format/money";
import { formatQuantity } from "../lib/order-math";
import { OrderActions } from "./order-actions";
import { editBlockedReason, OrderEditor } from "./order-editor";
import { OrderQr } from "./order-qr";
import { OrderStatusBadges } from "./status-badges";

/** One sentence telling the viewer what, if anything, happens next. */
function nextStep(order: Order): string | null {
  const buyer = order.viewerRole === "buyer";
  if (order.fulfillmentStatus === "cancelled") {
    const who = order.cancelledBy === "seller" ? "Người bán" : "Người mua";
    const reason = order.cancelReason ? ` Lý do: ${order.cancelReason}` : "";
    const refund = order.refundNeeded
      ? buyer
        ? " Người bán sẽ hoàn tiền cho bạn; hãy liên hệ họ nếu chưa nhận được."
        : " Người mua đã chuyển khoản, bạn cần hoàn tiền cho họ."
      : "";
    return `${who} đã hủy đơn này.${reason}${refund}`;
  }
  if (order.paymentStatus === "reported") {
    return buyer
      ? "Người bán sẽ xác nhận khi thấy tiền về. Trang này tự cập nhật."
      : "Người mua báo đã chuyển khoản. Hãy kiểm tra sao kê theo mã đơn rồi xác nhận.";
  }
  if (order.paymentStatus === "unpaid") {
    if (order.paymentMethod === "prepaid_qr") {
      return buyer
        ? "Quét mã QR để chuyển khoản, rồi bấm “Tôi đã chuyển khoản”."
        : "Đang chờ người mua chuyển khoản.";
    }
    return buyer
      ? "Bạn trả tiền cho người bán khi nhận hàng."
      : "Thu tiền khi giao hàng, rồi bấm “Đã nhận tiền”.";
  }
  if (order.fulfillmentStatus === "pending") {
    return buyer ? "Đã thanh toán. Đang chờ người bán giao hàng." : null;
  }
  return "Đơn hàng đã hoàn tất.";
}

export function OrderView({ id }: { id: string }) {
  const { data: order, error, isPending, refetch } = useOrder(id);
  const [editing, setEditing] = useState(false);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Đang tải đơn hàng">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!order) {
    const missing = error instanceof ApiError && [400, 404].includes(error.status);
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-24 text-center">
        <h1 className="text-[22px] font-semibold">
          {missing ? "Không tìm thấy đơn hàng" : "Không tải được đơn hàng"}
        </h1>
        {missing ? (
          <Link href="/orders" className={buttonVariants({ variant: "outline" })}>
            Về đơn của tôi
          </Link>
        ) : (
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            onClick={() => void refetch()}
          >
            Thử lại
          </button>
        )}
      </div>
    );
  }

  const buyer = order.viewerRole === "buyer";
  const step = nextStep(order);
  const editBlocked = editBlockedReason(order, new Date());

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {buyer ? "Đơn bạn đã đặt" : "Đơn bạn nhận được"} ·{" "}
          {formatDateTime(order.createdAt)}
        </p>
        <h1 className="text-[28px] leading-tight font-semibold">
          Đơn <span className="font-mono">{order.code}</span>
        </h1>
        <OrderStatusBadges order={order} />
      </header>

      {step && (
        <p className="rounded-md bg-surface px-4 py-3 text-sm">{step}</p>
      )}

      {order.qr && buyer && <OrderQr qr={order.qr} code={order.code} />}

      {editing && editBlocked === null ? (
        <OrderEditor order={order} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex flex-col gap-3">
          <OrderActions order={order} />
          {editBlocked === null && (
            <div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Sửa đơn
              </button>
              <span className="text-sm text-muted-foreground">
                {" "}
                · Bạn có thể đổi số lượng đến hạn chốt đơn.
              </span>
            </div>
          )}
          {editBlocked !== null && editBlocked !== "hidden" && (
            <p className="text-sm text-muted-foreground">{editBlocked}</p>
          )}
        </div>
      )}

      <section className="rounded-lg border border-border p-4">
        <h2 className="font-semibold">
          <Link
            href={`/listings/${order.listing.id}`}
            className="hover:text-primary hover:underline"
          >
            {order.listing.title}
          </Link>
        </h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.itemId} className="border-t border-hairline-soft">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  {line.itemName}
                  <span className="block text-[13px] text-muted-foreground">
                    {formatQuantity(line.quantity)} {line.unit} ×{" "}
                    {formatMoney(line.unitPrice)}
                  </span>
                </th>
                <td className="py-2 text-right whitespace-nowrap">
                  {formatMoney(line.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <th scope="row" className="py-3 text-left font-semibold">
                Tổng tiền
              </th>
              <td className="py-3 text-right text-lg font-semibold whitespace-nowrap">
                {formatMoney(order.totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">
            {buyer ? "Người bán" : "Người mua"}
          </dt>
          <dd className="font-medium">
            {buyer ? order.seller.name : order.buyer.name}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Giao đến</dt>
          <dd className="font-medium">{order.deliveryLocation}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Thanh toán</dt>
          <dd className="font-medium">
            {order.paymentMethod === "prepaid_qr"
              ? "Chuyển khoản trước qua mã QR"
              : "Trả tiền khi nhận hàng"}
          </dd>
        </div>
        {order.listing.deliveryDate && (
          <div>
            <dt className="text-muted-foreground">Ngày giao dự kiến</dt>
            <dd className="font-medium">{formatDate(order.listing.deliveryDate)}</dd>
          </div>
        )}
        {order.note && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Ghi chú</dt>
            <dd className="whitespace-pre-line">{order.note}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
