"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { selectClassName } from "@/shared/ui/molecules/field";
import { Label } from "@/shared/ui/atoms/shadcn/label";
import { useMyListings } from "@/features/listings";
import {
  type FulfillmentStatus,
  type PaymentStatus,
  type SalesFilters,
  useSales,
} from "../api/use-orders";
import { OrderList } from "./order-list";

const PAYMENT: readonly PaymentStatus[] = ["unpaid", "reported", "paid"];
const FULFILLMENT: readonly FulfillmentStatus[] = [
  "pending",
  "delivered",
  "cancelled",
];

function pick<T extends string>(
  value: string | null,
  options: readonly T[],
): T | null {
  return options.find((option) => option === value) ?? null;
}

/** Orders the seller has received. Filters live in the URL. */
export function SalesList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useTranslations("orders");
  const filters: SalesFilters = {
    listingId: params.get("listing"),
    paymentStatus: pick(params.get("payment"), PAYMENT),
    fulfillmentStatus: pick(params.get("delivery"), FULFILLMENT),
  };
  const sales = useSales(filters);
  const { data: openListings = [] } = useMyListings("open");
  const { data: closedListings = [] } = useMyListings("closed");
  // Keyed by id so a listing never appears twice in the filter.
  const listings = [
    ...new Map(
      [...openListings, ...closedListings].map((listing) => [listing.id, listing]),
    ).values(),
  ];

  function setFilter(name: string, value: string): void {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const filter = (
    id: string,
    label: string,
    name: string,
    value: string | null,
    options: { value: string; label: string }[],
  ) => (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className={selectClassName}
        value={value ?? ""}
        onChange={(event) => setFilter(name, event.target.value)}
      >
        <option value="">{t("sales.all")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] leading-tight font-semibold">{t("sales.title")}</h1>
      <div className="flex flex-col gap-3 sm:flex-row">
        {filter(
          "filter-listing",
          t("sales.listing"),
          "listing",
          filters.listingId,
          listings.map((listing) => ({ value: listing.id, label: listing.title })),
        )}
        {filter(
          "filter-payment",
          t("sales.payment"),
          "payment",
          filters.paymentStatus,
          PAYMENT.map((value) => ({
            value,
            label: t(`status.payment.${value}`),
          })),
        )}
        {filter(
          "filter-delivery",
          t("sales.delivery"),
          "delivery",
          filters.fulfillmentStatus,
          FULFILLMENT.map((value) => ({
            value,
            label: t(`status.fulfillment.${value}`),
          })),
        )}
      </div>
      <OrderList
        orders={sales.data?.pages.flatMap((page) => page.items)}
        isPending={sales.isPending}
        isError={sales.isError}
        onRetry={() => void sales.refetch()}
        hasNextPage={sales.hasNextPage}
        isFetchingNextPage={sales.isFetchingNextPage}
        onLoadMore={() => void sales.fetchNextPage()}
        empty={
          <p className="text-muted-foreground">
            {t("sales.empty")}
          </p>
        }
      />
    </div>
  );
}
