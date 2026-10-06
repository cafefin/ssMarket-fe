"use client";

import Link from "next/link";
import { buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { useMyOrders } from "@/lib/api/use-orders";
import { OrderList } from "./order-list";

export function MyOrders() {
  const orders = useMyOrders();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] leading-tight font-semibold">Đơn của tôi</h1>
      <OrderList
        orders={orders.data?.pages.flatMap((page) => page.items)}
        isPending={orders.isPending}
        isError={orders.isError}
        onRetry={() => void orders.refetch()}
        hasNextPage={orders.hasNextPage}
        isFetchingNextPage={orders.isFetchingNextPage}
        onLoadMore={() => void orders.fetchNextPage()}
        empty={
          <div className="flex flex-col items-center gap-3">
            <p className="text-muted-foreground">Bạn chưa đặt đơn nào.</p>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Xem hàng đang bán
            </Link>
          </div>
        }
      />
    </div>
  );
}
