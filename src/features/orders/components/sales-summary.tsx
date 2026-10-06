"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { selectClassName } from "@/shared/ui/molecules/field";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { ApiError, userMessage } from "@/shared/api/api-error";
import {
  type BulkAction,
  type SummaryRow,
  useBulkOrders,
  useSummary,
} from "../api/use-orders";
import { formatDate, formatDateTime } from "@/shared/lib/format/datetime";
import { formatMoney } from "@/shared/lib/format/money";
import { formatQuantity } from "../lib/order-math";
import { cn } from "@/shared/lib/utils";
import { OrderStatusBadges } from "./status-badges";

type Sort = "time" | "buyer" | "location";
type Filter = "all" | "unpaid" | "reported" | "undelivered";

const FILTERS: { value: Filter; label: string; test: (row: SummaryRow) => boolean }[] = [
  { value: "all", label: "Tất cả", test: () => true },
  { value: "unpaid", label: "Chưa trả", test: (row) => row.paymentStatus === "unpaid" },
  {
    value: "reported",
    label: "Chờ xác nhận",
    test: (row) => row.paymentStatus === "reported",
  },
  {
    value: "undelivered",
    label: "Chưa giao",
    test: (row) => row.fulfillmentStatus === "pending",
  },
];

const FAILURES: Record<string, string> = {
  INVALID_ORDER_STATE: "đã ở trạng thái này hoặc đã hủy",
  NOT_IN_LISTING: "không thuộc bài đăng này",
};

const collator = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });

function sortRows(rows: SummaryRow[], sort: Sort): SummaryRow[] {
  const sorted = [...rows];
  if (sort === "buyer") {
    sorted.sort((a, b) => collator.compare(a.buyer.name, b.buyer.name));
  } else if (sort === "location") {
    sorted.sort((a, b) => collator.compare(a.deliveryLocation, b.deliveryLocation));
  }
  return sorted;
}

function groupByLocation(rows: SummaryRow[]): { location: string; rows: SummaryRow[] }[] {
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

  if (summary.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Đang tải bảng tổng hợp">
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
          {hidden ? "Không tìm thấy bài đăng" : "Không tải được bảng tổng hợp"}
        </h1>
        {hidden ? (
          <Link href="/sell" className={buttonVariants({ variant: "outline" })}>
            Về bài đăng của tôi
          </Link>
        ) : (
          <Button variant="outline" onClick={() => void summary.refetch()}>
            Thử lại
          </Button>
        )}
      </div>
    );
  }

  const { listing, items, rows, totals } = summary.data;
  const visible = sortRows(
    rows.filter(FILTERS.find((option) => option.value === filter)!.test),
    grouped ? "location" : sort,
  );
  const groups = grouped
    ? groupByLocation(visible)
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
        toast.success(`Đã cập nhật ${done} đơn`);
      }
      setFailures(
        results
          .filter((result) => !result.ok)
          .map(
            (result) =>
              `${codeOf.get(result.orderId) ?? result.orderId}: ${
                FAILURES[result.code ?? ""] ?? "không cập nhật được"
              }`,
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
  const columnCount = items.length + 5;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Bảng tổng hợp đơn hàng</p>
        <h1 className="text-[28px] leading-tight font-semibold">
          <Link href={`/listings/${listing.id}`} className="hover:text-primary">
            {listing.title}
          </Link>
        </h1>
        {listing.orderDeadline && listing.deliveryDate && (
          <p className="text-sm text-muted-foreground">
            Chốt đơn {formatDateTime(listing.orderDeadline)} · Giao ngày{" "}
            {formatDate(listing.deliveryDate)}
          </p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {figure("Số đơn", String(totals.orderCount))}
        {figure("Tổng tiền", formatMoney(totals.totalAmount))}
        {figure("Đã thu", formatMoney(totals.paidAmount), "text-positive-deep")}
        {figure(
          "Còn phải thu",
          formatMoney(totals.outstandingAmount),
          totals.outstandingAmount > 0 ? "text-warn-deep" : undefined,
        )}
      </dl>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="group" aria-label="Lọc đơn" className="flex flex-wrap gap-2">
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
              {option.label}
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
            Gom theo nơi giao
          </label>
          <label className="flex items-center gap-2 text-sm">
            Sắp xếp
            <select
              className={cn(selectClassName, "h-9 w-auto")}
              value={grouped ? "location" : sort}
              disabled={grouped}
              onChange={(event) => setSort(event.target.value as Sort)}
            >
              <option value="time">Thời điểm đặt</option>
              <option value="buyer">Người mua</option>
              <option value="location">Nơi giao</option>
            </select>
          </label>
          <a
            href={`/api/listings/${listing.id}/summary.csv`}
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Xuất CSV
          </a>
        </div>
      </div>

      {visibleSelected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-primary-soft px-4 py-3">
          <span className="text-sm font-medium">
            Đã chọn {visibleSelected.length} đơn
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
            Xác nhận đã nhận tiền
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
            Đánh dấu đã giao
          </Button>
        </div>
      )}

      {failures.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn-deep"
        >
          <p className="font-medium">Một số đơn không cập nhật được:</p>
          <ul className="mt-1 list-disc pl-5">
            {failures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Chưa có ai đặt hàng ở bài này.
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
                    aria-label="Chọn tất cả đơn đang hiện"
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
                  Người mua
                </th>
                <th scope="col" className={th}>
                  Nơi giao
                </th>
                {items.map((item) => (
                  <th key={item.id} scope="col" className={cn(th, "text-right")}>
                    {item.name} ({item.unit})
                    {!item.isActive && (
                      <span className="block font-normal normal-case">
                        đã ngừng bán
                      </span>
                    )}
                  </th>
                ))}
                <th scope="col" className={cn(th, "text-right")}>
                  Tổng tiền
                </th>
                <th scope="col" className={th}>
                  Trạng thái
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
                    Không có đơn nào khớp bộ lọc này.
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
                                · {group.rows.length} đơn ·{" "}
                                {formatMoney(
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
                                aria-label={`Đánh dấu đã giao cả nhóm ${group.location}`}
                                onClick={() =>
                                  void run(
                                    "deliver",
                                    undelivered.map((row) => row.orderId),
                                  )
                                }
                              >
                                Đánh dấu đã giao cả nhóm
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
                            aria-label={`Chọn đơn ${row.code}`}
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
                        {items.map((item) => (
                          <td key={item.id} className="px-3 py-2 text-right">
                            {row.quantities[item.id] !== undefined
                              ? formatQuantity(row.quantities[item.id])
                              : ""}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                          {formatMoney(row.totalAmount)}
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
                  Tổng {totals.orderCount} đơn
                </th>
                {items.map((item) => (
                  <td key={item.id} className="px-3 py-2 text-right">
                    {formatQuantity(totals.quantities[item.id] ?? 0)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {formatMoney(totals.totalAmount)}
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
