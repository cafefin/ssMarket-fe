"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order } from "@/lib/api/use-orders";
import { formatDateTime } from "@/lib/format/datetime";
import { formatMoney } from "@/lib/format/money";
import { OrderActions } from "./order-actions";
import { OrderStatusBadges } from "./status-badges";

interface OrderListProps {
  orders: Order[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  empty: ReactNode;
}

/** Orders as a list, for the buyer ("Đơn của tôi") and the seller alike. */
export function OrderList({
  orders,
  isPending,
  isError,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  empty,
}: OrderListProps) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải đơn hàng">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }
  if (isError || !orders) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-12">
        <p className="text-error-deep">Không tải được danh sách đơn hàng.</p>
        <Button variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    );
  }
  if (orders.length === 0) {
    return <div className="py-12 text-center">{empty}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {orders.map((order) => {
          const seller = order.viewerRole === "seller";
          return (
            <li
              key={order.id}
              aria-label={`Đơn ${order.code}`}
              className="flex flex-col gap-3 rounded-lg border border-border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-mono font-medium hover:text-primary hover:underline"
                  >
                    {order.code}
                  </Link>
                  <p className="truncate text-sm">{order.listing.title}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {seller
                      ? `${order.buyer.name} · ${order.deliveryLocation}`
                      : `Người bán: ${order.seller.name}`}{" "}
                    · {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <p className="font-semibold whitespace-nowrap">
                  {formatMoney(order.totalAmount)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <OrderStatusBadges order={order} />
                {seller && <OrderActions order={order} compact />}
              </div>
            </li>
          );
        })}
      </ul>
      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={isFetchingNextPage} onClick={onLoadMore}>
            {isFetchingNextPage ? "Đang tải…" : "Xem thêm"}
          </Button>
        </div>
      )}
    </div>
  );
}
