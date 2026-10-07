"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import type { Order } from "../api/use-orders";
import { formatDateTime } from "@/shared/lib/format/datetime";
import { useFormat } from "@/shared/lib/format/use-format";
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

/** Orders as a list, for the buyer ("My orders") and the seller alike. */
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
  const t = useTranslations("orders.list");
  const tc = useTranslations("common");
  const format = useFormat();
  if (isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }
  if (isError || !orders) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-12">
        <p className="text-error-deep">{t("loadFailed")}</p>
        <Button variant="outline" onClick={onRetry}>
          {tc("retry")}
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
              aria-label={t("order", { code: order.code })}
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
                  <p className="truncate text-sm">
                    {order.listingCount > 1
                      ? t("moreListings", {
                          title: order.listing.title,
                          count: order.listingCount - 1,
                        })
                      : order.listing.title}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {seller
                      ? `${order.buyer.name} · ${order.deliveryLocation}`
                      : t("seller", { name: order.seller.name })}{" "}
                    · {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <p className="font-semibold whitespace-nowrap">
                  {format.money(order.totalAmount)}
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
            {isFetchingNextPage ? tc("loading") : tc("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
