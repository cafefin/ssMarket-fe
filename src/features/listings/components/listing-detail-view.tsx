"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { UserAvatar } from "@/shared/ui/molecules/user-avatar";
import { buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { ApiError } from "@/shared/api/api-error";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { type ListingDetail, useListing } from "../api/use-listings";
import { formatDate } from "@/shared/lib/format/datetime";
import { formatDeadline } from "@/shared/lib/format/deadline";
import { categoryName } from "../lib/category-name";
import { ImageGallery } from "./image-gallery";
import { Price } from "@/shared/ui/atoms/price";
import { useFormat } from "@/shared/lib/format/use-format";
import { ModeBadge } from "./mode-badge";

function ListingNotFound() {
  const t = useTranslations();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-24 text-center">
      <h1 className="text-[22px] font-semibold">
        {t("listings.detail.notFound")}
      </h1>
      <p className="text-muted-foreground">
        {t("listings.detail.notFoundHint")}
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        {t("common.backHome")}
      </Link>
    </div>
  );
}

/** Why the owner sees a listing that others may not, as a message key. */
function ownerNote(
  listing: ListingDetail,
): "ownerDraft" | "ownerClosed" | "ownerExpired" | null {
  if (listing.status === "draft") {
    return "ownerDraft";
  }
  if (listing.status === "closed") {
    return "ownerClosed";
  }
  if (!listing.isOpen) {
    return "ownerExpired";
  }
  return null;
}

function paymentMethods(
  listing: ListingDetail,
): ("prepaid_qr" | "pay_on_delivery")[] {
  return [
    ...(listing.acceptsPrepaidQr ? (["prepaid_qr"] as const) : []),
    ...(listing.acceptsPayOnDelivery ? (["pay_on_delivery"] as const) : []),
  ];
}

/** Price per unit, what is left and the combo deals of the product. */
function ProductFacts({ listing }: { listing: ListingDetail }) {
  const t = useTranslations("listings");
  const format = useFormat();
  return (
    <section className="flex flex-col gap-2">
      <p className="flex items-baseline gap-1.5">
        <Price amount={listing.unitPrice} size="lg" />
        <span className="text-sm text-muted-foreground">
          {t("detail.perUnit", { unit: listing.unit })}
        </span>
      </p>
      {listing.mode === "in_stock" &&
        listing.stockQuantity !== null &&
        (listing.stockQuantity === 0 ? (
          <p className="text-sm font-medium text-muted-foreground">
            {t("outOfStock")}
          </p>
        ) : (
          <p className="text-sm font-medium text-positive-deep">
            {t("card.remaining", {
              quantity: format.quantity(listing.stockQuantity),
              unit: listing.unit,
            })}
          </p>
        ))}
      {listing.combos.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md bg-primary-soft px-3 py-2 text-sm text-primary-deep">
          <h2 className="font-semibold">{t("detail.combos")}</h2>
          <ul className="flex flex-wrap gap-x-3">
            {listing.combos.map((combo) => (
              <li key={combo.quantity}>
                {t("detail.combo", {
                  quantity: format.quantity(Number(combo.quantity)),
                  unit: listing.unit,
                  price: format.money(combo.price),
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function ListingDetailView({
  id,
  renderBuy,
}: {
  id: string;
  /** Quantity, add to cart and buy now; the page passes the cart's, see app/. */
  renderBuy?: (listing: ListingDetail) => ReactNode;
}) {
  const { data: listing, error, isPending, refetch } = useListing(id);
  const { data: me } = useCurrentUser();
  const t = useTranslations("listings.detail");
  const tc = useTranslations("common");
  const tl = useTranslations("listings");
  const locale = useLocale();

  if (isPending) {
    return (
      <div
        className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-8 md:grid-cols-2"
        aria-busy="true"
        aria-label={t("loading")}
      >
        <Skeleton className="aspect-[4/3] w-full rounded-lg" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    if (error instanceof ApiError && [400, 404].includes(error.status)) {
      return <ListingNotFound />;
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

  const isOwner = me?.id === listing.seller.id;
  const note = isOwner ? ownerNote(listing) : null;

  return (
    <article className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-8 md:grid-cols-2">
      <ImageGallery images={listing.images} title={listing.title} />

      <div className="flex flex-col gap-6">
        {note && (
          <p className="rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn-deep">
            {t(note)}
          </p>
        )}

        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ModeBadge mode={listing.mode} />
            <span className="text-sm text-muted-foreground">
              {categoryName(listing.category, locale)}
            </span>
            {listing.condition && listing.conditionPercent !== null && (
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-[13px] font-semibold text-foreground">
                <span className="sr-only">{t("condition")}: </span>
                {tl("conditionLabel", {
                  level: tl(`condition.${listing.condition}`),
                  percent: listing.conditionPercent,
                })}
              </span>
            )}
          </div>
          <h1 className="text-2xl leading-tight font-bold md:text-3xl">
            {listing.title}
          </h1>
          <div className="flex items-center gap-3">
            <UserAvatar
              name={listing.seller.name}
              avatarUrl={listing.seller.avatarUrl}
              size="lg"
            />
            <div className="flex flex-col">
              <p className="text-sm text-muted-foreground">
                {t("seller")}{" "}
                <span className="text-foreground">{listing.seller.name}</span>
              </p>
              <Link
                href={`/sellers/${listing.seller.id}`}
                className="text-[13px] text-primary underline-offset-4 hover:underline"
              >
                {t("sellerPage")}
              </Link>
            </div>
          </div>
        </header>

        {listing.mode === "preorder" &&
          listing.orderDeadline &&
          listing.deliveryDate && (
            <dl className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 rounded-md bg-deadline-soft p-4 text-sm">
              <div>
                <dt className="text-deadline-deep">{t("deadline")}</dt>
                <dd className="text-lg leading-tight font-semibold text-deadline-deep">
                  {formatDeadline(listing.orderDeadline, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-deadline-deep">{t("deliveryDate")}</dt>
                <dd className="font-semibold">
                  {formatDate(listing.deliveryDate)}
                </dd>
              </div>
              {listing.orderCount > 0 && (
                <div className="min-[560px]:col-span-2">
                  <dt className="sr-only">{t("orderCountLabel")}</dt>
                  <dd className="font-medium text-deadline-deep">
                    {tl("orderCount", { count: listing.orderCount })}
                  </dd>
                </div>
              )}
            </dl>
          )}

        <ProductFacts listing={listing} />

        {/* The seller manages; everyone else can buy while it is open. */}
        {!isOwner && me && listing.isOpen && renderBuy?.(listing)}

        <section className="flex flex-col gap-1 text-sm">
          <h2 className="font-semibold">{t("payment")}</h2>
          <p className="text-muted-foreground">
            {paymentMethods(listing)
              .map((method) => tc(`paymentMethods.${method}`))
              .join(" · ")}
          </p>
        </section>

        {listing.description && (
          <section className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">{t("description")}</h2>
            <p className="whitespace-pre-line">{listing.description}</p>
          </section>
        )}

        {isOwner && (
          <div className="flex flex-wrap gap-3">
            {listing.status !== "closed" && (
              <Link
                href={`/listings/${listing.id}/edit`}
                className={buttonVariants({ variant: "outline" })}
              >
                {t("edit")}
              </Link>
            )}
            {listing.status !== "draft" && (
              <Link
                href={`/sell/listings/${listing.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                {t("summary")}
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
