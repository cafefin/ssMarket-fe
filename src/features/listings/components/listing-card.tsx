import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Price } from "@/shared/ui/atoms/price";
import type { ListingSummary } from "../api/use-listings";
import { closesToday } from "@/shared/lib/format/deadline";
import { useFormat } from "@/shared/lib/format/use-format";
import { cn } from "@/shared/lib/utils";
import { ImagePlaceholder } from "./image-placeholder";

/** What is left of an in-stock product, or that it is sold out. */
function Stock({ listing }: { listing: ListingSummary }) {
  const t = useTranslations("listings");
  const format = useFormat();
  if (listing.mode !== "in_stock" || listing.stockQuantity === null) {
    return null;
  }
  if (listing.stockQuantity === 0) {
    return (
      <p className="text-[13px] font-medium text-muted-foreground">
        {t("outOfStock")}
      </p>
    );
  }
  return (
    <p className="text-[13px] font-medium text-positive-deep">
      {t("card.remaining", {
        quantity: format.quantity(listing.stockQuantity),
        unit: listing.unit,
      })}
    </p>
  );
}

/** A pre-order shows when it closes on an orange strip, like a ticket stub. */
function Deadline({ listing }: { listing: ListingSummary }) {
  const t = useTranslations("listings");
  const format = useFormat();
  const today = listing.orderDeadline
    ? closesToday(listing.orderDeadline)
    : false;
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-2 px-2.5 py-1.5 text-xs font-semibold",
        today
          ? "bg-deadline text-foreground"
          : "bg-deadline-soft text-deadline-deep",
      )}
    >
      <span>
        {listing.orderDeadline
          ? t("card.closes", { deadline: format.deadline(listing.orderDeadline) })
          : t("mode.preorder")}
      </span>
      {listing.orderCount > 0 && (
        <span className="font-normal">
          {t("orderCount", { count: listing.orderCount })}
        </span>
      )}
    </p>
  );
}

/** Condition ("Like new 99%") and combo deals, in neutral text: information, not a status. */
function Facts({ listing }: { listing: ListingSummary }) {
  const t = useTranslations("listings");
  if (!listing.condition && !listing.hasCombos) {
    return null;
  }
  return (
    <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
      {listing.condition && listing.conditionPercent !== null && (
        <span>
          {t("conditionLabel", {
            level: t(`condition.${listing.condition}`),
            percent: listing.conditionPercent,
          })}
        </span>
      )}
      {listing.hasCombos && (
        <span className="font-medium text-primary-deep">{t("hasCombos")}</span>
      )}
    </p>
  );
}

/**
 * A product in a grid of two columns on phones and more on wider screens:
 * a square photo, then title, price, condition, stock and seller.
 */
export function ListingCard({
  listing,
  actions,
}: {
  listing: ListingSummary;
  /**
   * Controls under the card, such as adding to the cart. They sit outside
   * the link, so pressing them never opens the listing.
   */
  actions?: ReactNode;
}) {
  const t = useTranslations("listings");
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <Link
        href={`/listings/${listing.id}`}
        className="group flex flex-1 flex-col outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {listing.thumbnailUrl ? (
          // Served by our own API behind a session cookie, so next/image's
          // optimizer cannot fetch it; the backend already sends a 400px WebP.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.thumbnailUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="aspect-square w-full bg-surface object-cover"
          />
        ) : (
          <ImagePlaceholder className="aspect-square w-full" />
        )}

        {listing.mode === "preorder" && <Deadline listing={listing} />}

        <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
          <h3 className="line-clamp-2 text-sm leading-snug font-medium group-hover:text-primary">
            {listing.title}
          </h3>
          <Price amount={listing.unitPrice} size="sm" />
          <Facts listing={listing} />
          <Stock listing={listing} />
          <p className="mt-auto truncate pt-0.5 text-xs text-muted-foreground">
            {t("card.seller", { handle: listing.seller.handle })}
          </p>
        </div>
      </Link>

      {actions && <div className="px-2.5 pb-2.5">{actions}</div>}
    </div>
  );
}
