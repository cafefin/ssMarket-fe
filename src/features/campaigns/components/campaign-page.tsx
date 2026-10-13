"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";
import { categoryName } from "@/features/listings";
import { ApiError } from "@/shared/api/api-error";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { formatDate } from "@/shared/lib/format/datetime";
import { useFormat } from "@/shared/lib/format/use-format";
import { buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { UserAvatar } from "@/shared/ui/molecules/user-avatar";
import {
  type CampaignDetail,
  useCampaign,
  useMyCampaignOrder,
} from "../api/use-campaigns";
import {
  type SelectedLine,
  type Selection,
  selectedLines,
  selectionProblems,
  selectionTotal,
  toPickerItem,
} from "../lib/selection";
import { timeLeft } from "../lib/time-left";
import { CampaignItemPicker } from "./campaign-item-picker";

const WRAPPER = "mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8";

/** What the buy bar is told about the round and what is chosen in it. */
export interface CampaignBuyContext {
  campaign: CampaignDetail;
  lines: SelectedLine[];
  total: number;
  /** False while a chosen quantity cannot be ordered. */
  valid: boolean;
  /** Empties the selection, e.g. once it is in the cart. */
  clear: () => void;
}

function paymentMethods(
  campaign: CampaignDetail,
): ("prepaid_qr" | "pay_on_delivery")[] {
  return [
    ...(campaign.acceptsPrepaidQr ? (["prepaid_qr"] as const) : []),
    ...(campaign.acceptsPayOnDelivery ? (["pay_on_delivery"] as const) : []),
  ];
}

/** Who sells, when it closes and is delivered, how to pay, the description. */
function Terms({ campaign }: { campaign: CampaignDetail }) {
  const t = useTranslations("campaigns.page");
  const tc = useTranslations("common");
  const format = useFormat();
  const locale = useLocale();
  // Read once: the page says roughly how long is left, it is not a clock.
  const [now] = useState(() => Date.now());
  const left = campaign.isOpen ? timeLeft(campaign.orderDeadline, now) : null;
  const closed = campaign.status !== "draft" && !campaign.isOpen;

  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-deadline-soft px-2.5 py-0.5 text-[13px] font-semibold text-deadline-deep">
            {t("kind")}
          </span>
          <span className="text-sm text-muted-foreground">
            {categoryName(campaign.category, locale)}
          </span>
          {closed && (
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-[13px] font-semibold text-foreground">
              {t("closed")}
            </span>
          )}
        </div>
        <h1 className="text-2xl leading-tight font-bold break-words md:text-3xl">
          {campaign.title}
        </h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserAvatar
            name={campaign.seller.name}
            avatarUrl={campaign.seller.avatarUrl}
            size="xs"
          />
          <span>
            {t("seller")}{" "}
            <Link
              href={`/sellers/${campaign.seller.id}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {campaign.seller.name}
            </Link>
          </span>
        </p>
      </header>

      {/* The role sits on a wrapper: on the list it would replace the
          list's own role, and its terms and definitions with it. */}
      <div
        role="group"
        aria-label={t("terms")}
        className="rounded-md bg-deadline-soft p-4 text-sm"
      >
        <dl className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          <div>
            <dt className="text-deadline-deep">{t("deadline")}</dt>
            <dd className="text-lg leading-tight font-semibold text-deadline-deep">
              {format.deadline(campaign.orderDeadline)}
            </dd>
            {left && (
              <dd className="mt-0.5 font-medium text-deadline-deep">
                {t(`timeLeft.${left.unit}`, { count: left.count })}
              </dd>
            )}
            {closed && <dd className="mt-0.5">{t("closedHint")}</dd>}
          </div>
          <div>
            <dt className="text-deadline-deep">{t("deliveryDate")}</dt>
            <dd className="font-semibold">{formatDate(campaign.deliveryDate)}</dd>
          </div>
        </dl>
      </div>

      <section className="flex flex-col gap-1 text-sm">
        <h2 className="font-semibold">{t("payment")}</h2>
        <p className="text-muted-foreground">
          {paymentMethods(campaign)
            .map((method) => tc(`paymentMethods.${method}`))
            .join(" · ")}
        </p>
      </section>

      {campaign.description && (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">{t("description")}</h2>
          <p className="break-words whitespace-pre-line">{campaign.description}</p>
        </section>
      )}
    </>
  );
}

/**
 * A pre-order round: its terms, then its products with a quantity each.
 * Whoever may buy gets `renderBuy` in a bar that follows the page; the
 * seller gets the links to manage the round, and a buyer who already has an
 * order in it is sent to that order.
 */
export function CampaignPage({
  id,
  renderBuy,
}: {
  id: string;
  /** The buy bar; the page passes the cart's, see app/. */
  renderBuy?: (context: CampaignBuyContext) => ReactNode;
}) {
  const t = useTranslations("campaigns.page");
  const tc = useTranslations("common");
  const { data: campaign, error, isPending, refetch } = useCampaign(id);
  const { data: me } = useCurrentUser();
  const isOwner = Boolean(me && campaign && me.id === campaign.seller.id);
  const mayOrder = Boolean(me && campaign?.isOpen && !isOwner);
  const myOrder = useMyCampaignOrder(id, mayOrder);
  const [selection, setSelection] = useState<Selection>({});
  const items = useMemo(
    () => (campaign?.items ?? []).map(toPickerItem),
    [campaign],
  );

  if (isPending) {
    return (
      <div className={WRAPPER} aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-24 w-full rounded-md" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error || !campaign) {
    if (error instanceof ApiError && [400, 404].includes(error.status)) {
      return (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-24 text-center">
          <h1 className="text-[22px] font-semibold">{t("notFound")}</h1>
          <p className="text-muted-foreground">{t("notFoundHint")}</p>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            {tc("backHome")}
          </Link>
        </div>
      );
    }
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-24">
        <p className="text-error-deep">{t("loadFailed")}</p>
        <button
          type="button"
          className={buttonVariants({ variant: "outline" })}
          onClick={() => void refetch()}
        >
          {tc("retry")}
        </button>
      </div>
    );
  }

  const orderId = myOrder.data ?? null;
  // Buying waits until we know there is no order yet; a lookup that failed
  // does not stand in the way, the checkout refuses a second order itself.
  const canBuy = mayOrder && !myOrder.isLoading && orderId === null;
  const draft = campaign.status === "draft";

  return (
    <article className={WRAPPER}>
      {isOwner && draft && (
        <p className="rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn-deep">
          {t("draft")}
        </p>
      )}

      <Terms campaign={campaign} />

      {isOwner && (
        <div className="flex flex-wrap gap-3">
          {campaign.status !== "closed" && (
            <Link
              href={`/campaigns/${campaign.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("edit")}
            </Link>
          )}
          {!draft && (
            <Link
              href={`/sell/campaigns/${campaign.id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("summary")}
            </Link>
          )}
        </div>
      )}

      {orderId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-primary-deep">
          <div>
            <p className="font-semibold">{t("ordered")}</p>
            <p>{t("orderedHint")}</p>
          </div>
          <Link
            href={`/orders/${orderId}?edit=1`}
            className={buttonVariants({ size: "sm" })}
          >
            {t("editOrder")}
          </Link>
        </div>
      )}

      <section className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("products")}</h2>
        <CampaignItemPicker
          items={items}
          selection={selection}
          onChange={setSelection}
          disabled={myOrder.isLoading}
          readOnly={!canBuy && !myOrder.isLoading}
        />
      </section>

      {canBuy && renderBuy && (
        // Sticks above the phone tab bar, and near the bottom from md.
        <div className="sticky bottom-20 z-10 md:bottom-4">
          {renderBuy({
            campaign,
            lines: selectedLines(items, selection),
            total: selectionTotal(items, selection),
            valid: selectionProblems(items, selection).length === 0,
            clear: () => setSelection({}),
          })}
        </div>
      )}
    </article>
  );
}
