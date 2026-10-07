"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { ApiError } from "@/shared/api/api-error";
import { type Order, useOrder } from "../api/use-orders";
import { formatDate, formatDateTime } from "@/shared/lib/format/datetime";
import type { Translator } from "@/shared/i18n/translator";
import { useFormat } from "@/shared/lib/format/use-format";
import { OrderActions } from "./order-actions";
import { editBlockedReason, OrderEditor } from "./order-editor";
import { OrderQr } from "./order-qr";
import { OrderStatusBadges } from "./status-badges";

/** One sentence telling the viewer what, if anything, happens next. */
function nextStep(order: Order, t: Translator<"orders.view.next">): string | null {
  const buyer = order.viewerRole === "buyer";
  if (order.fulfillmentStatus === "cancelled") {
    return [
      order.cancelledBy === "seller"
        ? t("cancelledBySeller")
        : t("cancelledByBuyer"),
      order.cancelReason && t("reason", { reason: order.cancelReason }),
      order.refundNeeded &&
        (buyer ? t("refundBuyer") : t("refundSeller")),
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (order.paymentStatus === "reported") {
    return buyer ? t("reportedBuyer") : t("reportedSeller");
  }
  if (order.paymentStatus === "unpaid") {
    if (order.paymentMethod === "prepaid_qr") {
      return buyer ? t("qrBuyer") : t("qrSeller");
    }
    return buyer ? t("onDeliveryBuyer") : t("onDeliverySeller");
  }
  if (order.fulfillmentStatus === "pending") {
    return buyer ? t("paidBuyer") : null;
  }
  return t("done");
}

export function OrderView({ id }: { id: string }) {
  const { data: order, error, isPending, refetch } = useOrder(id);
  const [editing, setEditing] = useState(false);
  const t = useTranslations("orders.view");
  const tn = useTranslations("orders.view.next");
  const te = useTranslations("orders.editor.blocked");
  const tc = useTranslations("common");
  const format = useFormat();

  if (isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!order) {
    const missing = error instanceof ApiError && [400, 404].includes(error.status);
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-24 text-center">
        <h1 className="text-[22px] font-semibold">
          {missing ? t("notFound") : t("loadFailed")}
        </h1>
        {missing ? (
          <Link href="/orders" className={buttonVariants({ variant: "outline" })}>
            {t("backToMine")}
          </Link>
        ) : (
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            onClick={() => void refetch()}
          >
            {tc("retry")}
          </button>
        )}
      </div>
    );
  }

  const buyer = order.viewerRole === "buyer";
  const step = nextStep(order, tn);
  const editBlocked = editBlockedReason(order, new Date());

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {buyer ? t("placed") : t("received")} ·{" "}
          {formatDateTime(order.createdAt)}
        </p>
        <h1 className="text-[28px] leading-tight font-semibold">
          {t.rich("title", {
            code: order.code,
            mono: (chunks) => <span className="font-mono">{chunks}</span>,
          })}
        </h1>
        <OrderStatusBadges order={order} />
      </header>

      {step && (
        <p className="rounded-md bg-surface px-4 py-3 text-sm">{step}</p>
      )}

      {order.qr && buyer && <OrderQr qr={order.qr} code={order.code} />}

      {editing && editBlocked === null ? (
        <OrderEditor order={order} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex flex-col gap-3">
          <OrderActions order={order} />
          {editBlocked === null && (
            <div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("edit")}
              </button>
              <span className="text-sm text-muted-foreground">
                {t("editHint")}
              </span>
            </div>
          )}
          {editBlocked !== null && editBlocked !== "hidden" && (
            <p className="text-sm text-muted-foreground">{te(editBlocked)}</p>
          )}
        </div>
      )}

      <section className="rounded-lg border border-border p-4">
        <h2 className="font-semibold">
          <Link
            href={`/listings/${order.listing.id}`}
            className="hover:text-primary hover:underline"
          >
            {order.listing.title}
          </Link>
        </h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.itemId} className="border-t border-hairline-soft">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  {order.listingCount > 1 && (
                    <span className="block text-[13px] text-muted-foreground">
                      {line.listingTitle}
                    </span>
                  )}
                  {line.itemName}
                  <span className="block text-[13px] text-muted-foreground">
                    {format.quantity(line.quantity)} {line.unit} ×{" "}
                    {format.money(line.unitPrice)}
                  </span>
                </th>
                <td className="py-2 text-right whitespace-nowrap">
                  {format.money(line.lineTotal)}
                  {line.listTotal > line.lineTotal && (
                    <span className="block text-[13px] text-muted-foreground line-through">
                      <span className="sr-only">
                        {t("savedWithCombos", {
                          listTotal: format.money(line.listTotal),
                        })}
                      </span>
                      <span aria-hidden="true">
                        {format.money(line.listTotal)}
                      </span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <th scope="row" className="py-3 text-left font-semibold">
                {t("total")}
              </th>
              <td className="py-3 text-right text-lg font-semibold whitespace-nowrap">
                {format.money(order.totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">
            {buyer ? t("seller") : t("buyer")}
          </dt>
          <dd className="font-medium">
            {buyer ? order.seller.name : order.buyer.name}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("deliverTo")}</dt>
          <dd className="font-medium">{order.deliveryLocation}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("payment")}</dt>
          <dd className="font-medium">
            {tc(`paymentMethods.${order.paymentMethod}`)}
          </dd>
        </div>
        {order.listing.deliveryDate && (
          <div>
            <dt className="text-muted-foreground">{t("deliveryDate")}</dt>
            <dd className="font-medium">{formatDate(order.listing.deliveryDate)}</dd>
          </div>
        )}
        {order.note && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">{t("note")}</dt>
            <dd className="whitespace-pre-line">{order.note}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
