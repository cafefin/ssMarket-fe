"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { useMyOrders } from "../api/use-orders";
import { OrderList } from "./order-list";

export function MyOrders() {
  const orders = useMyOrders();
  const t = useTranslations("orders.mine");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] leading-tight font-semibold">{t("title")}</h1>
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
            <p className="text-muted-foreground">{t("empty")}</p>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              {t("browse")}
            </Link>
          </div>
        }
      />
    </div>
  );
}
