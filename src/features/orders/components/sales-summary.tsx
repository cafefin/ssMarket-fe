"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { selectClassName } from "@/shared/ui/molecules/field";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { ApiError } from "@/shared/api/api-error";
import { useUserMessage } from "@/shared/api/use-user-message";
import {
  type BulkAction,
  type SummaryRow,
  useBulkOrders,
  useSummary,
} from "../api/use-orders";
import { formatDate, formatDateTime } from "@/shared/lib/format/datetime";
import { useFormat } from "@/shared/lib/format/use-format";
import { cn } from "@/shared/lib/utils";
import { OrderStatusBadges } from "./status-badges";

type Sort = "time" | "buyer" | "location";
type Filter = "all" | "unpaid" | "reported" | "undelivered";

const FILTERS: { value: Filter; test: (row: SummaryRow) => boolean }[] = [
  { value: "all", test: () => true },
  { value: "unpaid", test: (row) => row.paymentStatus === "unpaid" },
  { value: "reported", test: (row) => row.paymentStatus === "reported" },
  { value: "undelivered", test: (row) => row.fulfillmentStatus === "pending" },
];

/** Bulk failure codes with their own explanation in `orders.summary.failures`. */
const KNOWN_FAILURES = ["INVALID_ORDER_STATE", "NOT_IN_LISTING"] as const;

function failureKey(code: string | undefined | null) {
  return KNOWN_FAILURES.find((known) => known === code) ?? "other";
}

function sortRows(
  rows: SummaryRow[],
  sort: Sort,
  collator: Intl.Collator,
): SummaryRow[] {
  const sorted = [...rows];
  if (sort === "buyer") {
    sorted.sort((a, b) => collator.compare(a.buyer.name, b.buyer.name));
  } else if (sort === "location") {
    sorted.sort((a, b) => collator.compare(a.deliveryLocation, b.deliveryLocation));
  }
  return sorted;
}

function groupByLocation(
  rows: SummaryRow[],
  collator: Intl.Collator,
): { location: string; rows: SummaryRow[] }[] {
  const groups = new Map<string, SummaryRow[]>();
  for (const row of rows) {
    const key = row.deliveryLocation.trim();
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => collator.compare(a, b))
    .map(([location, grouped]) => ({ location, rows: grouped }));
}

/** The table that replaces the seller's spreadsheet for one listing. */
export function SalesSummary({ listingId }: { listingId: string }) {
  const summary = useSummary(listingId);
  const bulk = useBulkOrders(listingId);
  const [sort, setSort] = useState<Sort>("time");
  const [grouped, setGrouped] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [failures, setFailures] = useState<string[]>([]);
  const t = useTranslations("orders.summary");
  const tc = useTranslations("common");
  const locale = useLocale();
  const format = useFormat();
  const userMessage = useUserMessage();
  // Names and places sort the way the language of the page expects.
  const collator = useMemo(
    () => new Intl.Collator(locale, { numeric: true, sensitivity: "base" }),
    [locale],
  );

  if (summary.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!summary.data) {
    const hidden =
      summary.error instanceof ApiError &&
      [400, 403, 404].includes(summary.error.status);
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-24 text-center">
        <h1 className="text-[22px] font-semibold">
          {hidden ? t("notFound") : t("loadFailed")}
        </h1>
        {hidden ? (
          <Link href="/sell" className={buttonVariants({ variant: "outline" })}>
            {t("backToMine")}
          </Link>
        ) : (
          <Button variant="outline" onClick={() => void summary.refetch()}>
            {tc("retry")}
          </Button>
        )}
      </div>
    );
  }

  const { listing, rows, totals } = summary.data;
  const visible = sortRows(
    rows.filter(FILTERS.find((option) => option.value === filter)!.test),
    grouped ? "location" : sort,
    collator,
  );
  const groups = grouped
    ? groupByLocation(visible, collator)
    : [{ location: "", rows: visible }];
  const codeOf = new Map(rows.map((row) => [row.orderId, row.code]));
  const visibleSelected = visible.filter((row) => selected.has(row.orderId));
  const allSelected = visible.length > 0 && visibleSelected.length === visible.length;

  function toggle(orderId: string): void {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(orderId)) {
        next.add(orderId);
      }
      return next;
    });
  }

  async function run(action: BulkAction, orderIds: string[]): Promise<void> {
    setFailures([]);
    try {
      const results = await bulk.mutateAsync({ action, orderIds });
      const done = results.filter((result) => result.ok).length;
      if (done > 0) {
        toast.success(t("updated", { count: done }));
      }
      setFailures(
        results
          .filter((result) => !result.ok)
          .map((result) =>
            t("failure", {
              code: codeOf.get(result.orderId) ?? result.orderId,
              reason: t(`failures.${failureKey(result.code)}`),
            }),
          ),
      );
      setSelected(new Set());
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  const figure = (label: string, value: string, tone?: string) => (
    <div className="rounded-lg border border-border p-4">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className={cn("text-lg font-semibold", tone)}>{value}</dd>
    </div>
  );
  const th =
    "px-3 py-2 text-left text-[11px] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase";
  const columnCount = 6;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="text-[28px] leading-tight font-semibold">
          <Link href={`/listings/${listing.id}`} className="hover:text-primary">
            {listing.title}
          </Link>
        </h1>
        {listing.orderDeadline && listing.deliveryDate && (
          <p className="text-sm text-muted-foreground">
            {t("dates", {
              deadline: formatDateTime(listing.orderDeadline),
              delivery: formatDate(listing.deliveryDate),
            })}
          </p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {figure(t("figures.orders"), String(totals.orderCount))}
        {figure(t("figures.total"), format.money(totals.totalAmount))}
        {figure(
          t("figures.paid"),
          format.money(totals.paidAmount),
          "text-positive-deep",
        )}
        {figure(
          t("figures.outstanding"),
          format.money(totals.outstandingAmount),
          totals.outstandingAmount > 0 ? "text-warn-deep" : undefined,
        )}
      </dl>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="group" aria-label={t("filterGroup")} className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                "min-h-9 rounded-full border px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:min-h-11",
                filter === option.value
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`filters.${option.value}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={grouped}
              onChange={(event) => setGrouped(event.target.checked)}
            />
            {t("groupByLocation")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            {t("sort")}
            <select
              className={cn(selectClassName, "h-9 w-auto")}
              value={grouped ? "location" : sort}
              disabled={grouped}
              onChange={(event) => setSort(event.target.value as Sort)}
            >
              <option value="time">{t("sortBy.time")}</option>
              <option value="buyer">{t("sortBy.buyer")}</option>
              <option value="location">{t("sortBy.location")}</option>
            </select>
          </label>
          <a
            href={`/api/listings/${listing.id}/summary.csv`}
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("exportCsv")}
          </a>
        </div>
      </div>

      {visibleSelected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-primary-soft px-4 py-3">
          <span className="text-sm font-medium">
            {t("selected", { count: visibleSelected.length })}
          </span>
          <Button
            size="sm"
            disabled={bulk.isPending}
            onClick={() =>
              void run(
                "confirm_payment",
                visibleSelected.map((row) => row.orderId),
              )
            }
          >
            {t("confirmPaid")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulk.isPending}
            onClick={() =>
              void run(
                "deliver",
                visibleSelected.map((row) => row.orderId),
              )
            }
          >
            {t("markDelivered")}
          </Button>
        </div>
      )}

      {failures.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn-deep"
        >
          <p className="font-medium">{t("someFailed")}</p>
          <ul className="mt-1 list-disc pl-5">
            {failures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-surface">
              <tr>
                <th scope="col" className={cn(th, "w-10")}>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    aria-label={t("selectAll")}
                    checked={allSelected}
                    onChange={() =>
                      setSelected(
                        allSelected
                          ? new Set()
                          : new Set(visible.map((row) => row.orderId)),
                      )
                    }
                  />
                </th>
                <th scope="col" className={cn(th, "sticky left-0 z-10 bg-surface")}>
                  {t("columns.buyer")}
                </th>
                <th scope="col" className={th}>
                  {t("columns.location")}
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  {t("columns.quantity", { unit: listing.unit })}
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  {t("columns.total")}
                </th>
                <th scope="col" className={th}>
                  {t("columns.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    {t("noMatch")}
                  </td>
                </tr>
              )}
              {groups.map((group) => {
                const undelivered = group.rows.filter(
                  (row) => row.fulfillmentStatus === "pending",
                );
                return (
                  <Fragment key={group.location || "all"}>
                    {grouped && (
                      <tr className="border-t border-border bg-surface-soft">
                        <th
                          scope="rowgroup"
                          colSpan={columnCount}
                          className="px-3 py-2 text-left"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              {group.location}{" "}
                              <span className="font-normal text-muted-foreground">
                                {t("groupCount", { count: group.rows.length })}{" "}
                                {format.money(
                                  group.rows.reduce(
                                    (sum, row) => sum + row.totalAmount,
                                    0,
                                  ),
                                )}
                              </span>
                            </span>
                            {undelivered.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={bulk.isPending}
                                aria-label={t("markGroupDeliveredNamed", {
                                  location: group.location,
                                })}
                                onClick={() =>
                                  void run(
                                    "deliver",
                                    undelivered.map((row) => row.orderId),
                                  )
                                }
                              >
                                {t("markGroupDelivered")}
                              </Button>
                            )}
                          </div>
                        </th>
                      </tr>
                    )}
                    {group.rows.map((row) => (
                      <tr key={row.orderId} className="border-t border-hairline-soft">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            aria-label={t("selectOrder", { code: row.code })}
                            checked={selected.has(row.orderId)}
                            onChange={() => toggle(row.orderId)}
                          />
                        </td>
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-normal"
                        >
                          <span className="block font-medium whitespace-nowrap">
                            {row.buyer.name}
                          </span>
                          <Link
                            href={`/orders/${row.orderId}`}
                            className="font-mono text-[13px] text-muted-foreground hover:text-primary hover:underline"
                          >
                            {row.code}
                          </Link>
                        </th>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.deliveryLocation}
                          {row.note && (
                            <span className="block max-w-48 truncate text-[13px] text-muted-foreground">
                              {row.note}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {format.quantity(row.quantity)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                          {format.money(row.totalAmount)}
                        </td>
                        <td className="px-3 py-2">
                          <OrderStatusBadges
                            order={{ ...row, refundNeeded: false }}
                          />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface font-semibold">
                <td />
                <th
                  scope="row"
                  colSpan={2}
                  className="sticky left-0 bg-surface px-3 py-2 text-left"
                >
                  {t("totalRow", { count: totals.orderCount })}
                </th>
                <td className="px-3 py-2 text-right">
                  {format.quantity(totals.quantity)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {format.money(totals.totalAmount)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
