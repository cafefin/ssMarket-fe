"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useBulkOrders, useSummary } from "../api/use-orders";
import { useFormat } from "@/shared/lib/format/use-format";
import {
  SummaryBulk,
  SummaryControls,
  SummaryFigures,
  SummaryLoading,
  SummaryTable,
  SummaryTh,
  SummaryUnavailable,
  useSummaryView,
} from "./summary-shared";

/** The table that replaces the seller's spreadsheet for one listing. */
export function SalesSummary({ listingId }: { listingId: string }) {
  const summary = useSummary(listingId);
  const bulk = useBulkOrders(listingId);
  const view = useSummaryView(summary.data?.rows ?? [], bulk);
  const t = useTranslations("orders.summary");
  const format = useFormat();

  if (summary.isPending) {
    return <SummaryLoading label={t("loading")} />;
  }
  if (!summary.data) {
    return (
      <SummaryUnavailable
        error={summary.error}
        onRetry={() => void summary.refetch()}
        notFound={t("notFound")}
        loadFailed={t("loadFailed")}
        backLabel={t("backToMine")}
      />
    );
  }

  const { listing, rows, totals } = summary.data;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="text-[28px] leading-tight font-semibold">
          <Link href={`/listings/${listing.id}`} className="hover:text-primary">
            {listing.title}
          </Link>
        </h1>
      </header>

      <SummaryFigures totals={totals} />
      <SummaryControls view={view} csvHref={`/api/listings/${listing.id}/summary.csv`} />
      <SummaryBulk view={view} />

      {rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <SummaryTable
          view={view}
          totals={totals}
          quantityCount={1}
          quantityHeads={
            <SummaryTh className="text-right">
              {t("columns.quantity", { unit: format.unit(listing.unit) })}
            </SummaryTh>
          }
          quantityCells={(row) => (
            <td className="px-3 py-2 text-right">{format.quantity(row.quantity)}</td>
          )}
          quantityTotals={
            <td className="px-3 py-2 text-right">{format.quantity(totals.quantity)}</td>
          }
        />
      )}
    </div>
  );
}
