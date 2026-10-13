"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/shared/api/api-error";
import { useUserMessage } from "@/shared/api/use-user-message";
import { useFormat } from "@/shared/lib/format/use-format";
import { cn } from "@/shared/lib/utils";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { selectClassName } from "@/shared/ui/molecules/field";
import type { BulkAction, BulkResult, SummaryRow } from "../api/use-orders";
import { OrderStatusBadges } from "./status-badges";

// What the seller's summary of a listing and of a pre-order round have in
// common: sorting, filtering, grouping by place, selecting orders, the bulk
// actions and the table frame. Each summary adds its own quantity columns.

/** The fields of a summary row both kinds of summary have. */
export type BaseRow = Pick<
  SummaryRow,
  | "orderId"
  | "code"
  | "buyer"
  | "deliveryLocation"
  | "totalAmount"
  | "paymentMethod"
  | "paymentStatus"
  | "fulfillmentStatus"
  | "note"
  | "createdAt"
>;

export interface SummaryTotals {
  orderCount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
}

type Sort = "time" | "buyer" | "location";
type Filter = "all" | "unpaid" | "reported" | "undelivered";

const FILTERS: { value: Filter; test: (row: BaseRow) => boolean }[] = [
  { value: "all", test: () => true },
  { value: "unpaid", test: (row) => row.paymentStatus === "unpaid" },
  { value: "reported", test: (row) => row.paymentStatus === "reported" },
  { value: "undelivered", test: (row) => row.fulfillmentStatus === "pending" },
];

/** Bulk failure codes with their own explanation in `orders.summary.failures`. */
const KNOWN_FAILURES = [
  "INVALID_ORDER_STATE",
  "NOT_IN_LISTING",
  "NOT_IN_CAMPAIGN",
] as const;

function failureKey(code: string | undefined | null) {
  return KNOWN_FAILURES.find((known) => known === code) ?? "other";
}

function sortRows<R extends BaseRow>(
  rows: R[],
  sort: Sort,
  collator: Intl.Collator,
): R[] {
  const sorted = [...rows];
  if (sort === "buyer") {
    sorted.sort((a, b) => collator.compare(a.buyer.name, b.buyer.name));
  } else if (sort === "location") {
    sorted.sort((a, b) => collator.compare(a.deliveryLocation, b.deliveryLocation));
  }
  return sorted;
}

function groupByLocation<R extends BaseRow>(
  rows: R[],
  collator: Intl.Collator,
): { location: string; rows: R[] }[] {
  const groups = new Map<string, R[]>();
  for (const row of rows) {
    const key = row.deliveryLocation.trim();
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => collator.compare(a, b))
    .map(([location, grouped]) => ({ location, rows: grouped }));
}

interface BulkMutation {
  mutateAsync: (input: {
    action: BulkAction;
    orderIds: string[];
  }) => Promise<BulkResult[]>;
  isPending: boolean;
}

/** The state of a summary: what is shown, what is selected, the bulk actions. */
export function useSummaryView<R extends BaseRow>(rows: R[], bulk: BulkMutation) {
  const [sort, setSort] = useState<Sort>("time");
  const [grouped, setGrouped] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [failures, setFailures] = useState<string[]>([]);
  const t = useTranslations("orders.summary");
  const locale = useLocale();
  const userMessage = useUserMessage();
  // Names and places sort the way the language of the page expects.
  const collator = useMemo(
    () => new Intl.Collator(locale, { numeric: true, sensitivity: "base" }),
    [locale],
  );

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

  function toggleAll(): void {
    setSelected(
      allSelected ? new Set() : new Set(visible.map((row) => row.orderId)),
    );
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

  return {
    sort,
    setSort,
    grouped,
    setGrouped,
    filter,
    setFilter,
    selected,
    failures,
    visible,
    groups,
    visibleSelected,
    allSelected,
    toggle,
    toggleAll,
    run,
    pending: bulk.isPending,
  };
}

export type SummaryView<R extends BaseRow> = ReturnType<typeof useSummaryView<R>>;

export function SummaryLoading({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label={label}>
      <Skeleton className="h-9 w-1/2" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/** Shown instead of the summary: not found (hidden from non-sellers) or a failure. */
export function SummaryUnavailable({
  error,
  onRetry,
  notFound,
  loadFailed,
  backLabel,
}: {
  error: unknown;
  onRetry: () => void;
  notFound: string;
  loadFailed: string;
  backLabel: string;
}) {
  const tc = useTranslations("common");
  const hidden = error instanceof ApiError && [400, 403, 404].includes(error.status);
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-[22px] font-semibold">{hidden ? notFound : loadFailed}</h1>
      {hidden ? (
        <Link href="/sell" className={buttonVariants({ variant: "outline" })}>
          {backLabel}
        </Link>
      ) : (
        <Button variant="outline" onClick={onRetry}>
          {tc("retry")}
        </Button>
      )}
    </div>
  );
}

export function SummaryFigures({ totals }: { totals: SummaryTotals }) {
  const t = useTranslations("orders.summary");
  const format = useFormat();
  const figure = (label: string, value: string, tone?: string) => (
    <div className="rounded-lg border border-border p-4">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className={cn("text-lg font-semibold", tone)}>{value}</dd>
    </div>
  );
  return (
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
  );
}

/** The filter chips, grouping, sorting and the CSV link. */
export function SummaryControls<R extends BaseRow>({
  view,
  csvHref,
}: {
  view: SummaryView<R>;
  csvHref: string;
}) {
  const t = useTranslations("orders.summary");
  const { filter, setFilter, grouped, setGrouped, sort, setSort } = view;
  return (
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
          href={csvHref}
          download
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("exportCsv")}
        </a>
      </div>
    </div>
  );
}

/** The bulk actions for the selected orders, and the orders that failed. */
export function SummaryBulk<R extends BaseRow>({ view }: { view: SummaryView<R> }) {
  const t = useTranslations("orders.summary");
  const { visibleSelected, failures, pending, run } = view;
  const ids = visibleSelected.map((row) => row.orderId);
  return (
    <>
      {visibleSelected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-primary-soft px-4 py-3">
          <span className="text-sm font-medium">
            {t("selected", { count: visibleSelected.length })}
          </span>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => void run("confirm_payment", ids)}
          >
            {t("confirmPaid")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => void run("deliver", ids)}
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
    </>
  );
}

const TH =
  "px-3 py-2 text-left text-[11px] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase";

/** A header cell of the summary table, for the quantity columns. */
export function SummaryTh({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th scope="col" className={cn(TH, className)}>
      {children}
    </th>
  );
}

/**
 * The table frame: selection, buyer (sticky), place, then the quantity
 * columns of the caller, total and status. Scrolls sideways on its own.
 */
export function SummaryTable<R extends BaseRow>({
  view,
  totals,
  quantityHeads,
  quantityCount,
  quantityCells,
  quantityTotals,
}: {
  view: SummaryView<R>;
  totals: SummaryTotals;
  /** Header cells of the quantity columns. */
  quantityHeads: ReactNode;
  quantityCount: number;
  quantityCells: (row: R) => ReactNode;
  /** Cells of the totals row, one per quantity column. */
  quantityTotals: ReactNode;
}) {
  const t = useTranslations("orders.summary");
  const format = useFormat();
  const { visible, groups, grouped, selected, allSelected, pending } = view;
  const columnCount = 5 + quantityCount;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-surface">
          <tr>
            <th scope="col" className={cn(TH, "w-10")}>
              <input
                type="checkbox"
                className="size-4 accent-primary"
                aria-label={t("selectAll")}
                checked={allSelected}
                onChange={view.toggleAll}
              />
            </th>
            <th scope="col" className={cn(TH, "sticky left-0 z-10 bg-surface")}>
              {t("columns.buyer")}
            </th>
            <SummaryTh>{t("columns.location")}</SummaryTh>
            {quantityHeads}
            <SummaryTh className="text-right">{t("columns.total")}</SummaryTh>
            <SummaryTh>{t("columns.status")}</SummaryTh>
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
                              group.rows.reduce((sum, row) => sum + row.totalAmount, 0),
                            )}
                          </span>
                        </span>
                        {undelivered.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            aria-label={t("markGroupDeliveredNamed", {
                              location: group.location,
                            })}
                            onClick={() =>
                              void view.run(
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
                        onChange={() => view.toggle(row.orderId)}
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
                    {quantityCells(row)}
                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                      {format.money(row.totalAmount)}
                    </td>
                    <td className="px-3 py-2">
                      <OrderStatusBadges order={{ ...row, refundNeeded: false }} />
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
            {quantityTotals}
            <td className="px-3 py-2 text-right whitespace-nowrap">
              {format.money(totals.totalAmount)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
