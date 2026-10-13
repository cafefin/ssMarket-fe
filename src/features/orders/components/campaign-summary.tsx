"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDate } from "@/shared/lib/format/datetime";
import { useFormat } from "@/shared/lib/format/use-format";
import { useCampaignBulkOrders, useCampaignSummary } from "../api/use-orders";
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

/** The table that replaces the seller's spreadsheet for one pre-order round. */
export function CampaignSummary({ campaignId }: { campaignId: string }) {
  const summary = useCampaignSummary(campaignId);
  const bulk = useCampaignBulkOrders(campaignId);
  const view = useSummaryView(summary.data?.rows ?? [], bulk);
  const t = useTranslations("orders.summary");
  const tr = useTranslations("orders.campaignSummary");
  const format = useFormat();

  if (summary.isPending) {
    return <SummaryLoading label={tr("loading")} />;
  }
  if (!summary.data) {
    return (
      <SummaryUnavailable
        error={summary.error}
        onRetry={() => void summary.refetch()}
        notFound={tr("notFound")}
        loadFailed={tr("loadFailed")}
        backLabel={tr("backToMine")}
      />
    );
  }

  const { campaign, items, rows, itemTotals, totals } = summary.data;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{tr("eyebrow")}</p>
        <h1 className="text-[28px] leading-tight font-semibold">
          <Link href={`/campaigns/${campaign.id}`} className="hover:text-primary">
            {campaign.title}
          </Link>
        </h1>
        <p className="text-sm text-muted-foreground">
          {tr("when", {
            deadline: format.deadline(campaign.orderDeadline),
            date: formatDate(campaign.deliveryDate),
          })}
        </p>
      </header>

      <SummaryFigures totals={totals} />
      <SummaryControls view={view} csvHref={`/api/campaigns/${campaign.id}/summary.csv`} />
      <SummaryBulk view={view} />

      {rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{tr("empty")}</p>
      ) : (
        <SummaryTable
          view={view}
          totals={totals}
          quantityCount={items.length}
          quantityHeads={items.map((item) => (
            <SummaryTh key={item.listingId} className="text-right">
              {t("columns.product", {
                title: item.title,
                unit: format.unit(item.unit),
              })}
            </SummaryTh>
          ))}
          quantityCells={(row) =>
            items.map((item, index) => (
              <td key={item.listingId} className="px-3 py-2 text-right">
                {row.quantities[index] > 0 ? format.quantity(row.quantities[index]) : null}
              </td>
            ))
          }
          quantityTotals={items.map((item, index) => (
            <td key={item.listingId} className="px-3 py-2 text-right">
              {format.quantity(itemTotals[index])}
            </td>
          ))}
        />
      )}
    </div>
  );
}
