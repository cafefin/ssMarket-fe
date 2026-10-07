import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Price } from "@/shared/ui/atoms/price";
import { UserAvatar } from "@/shared/ui/molecules/user-avatar";
import type { ListingSummary } from "../api/use-listings";
import { closesToday } from "@/shared/lib/format/deadline";
import { useFormat } from "@/shared/lib/format/use-format";
import { cn } from "@/shared/lib/utils";
import { ImagePlaceholder } from "./image-placeholder";

type CardLayout = "responsive" | "stacked";

const FOOT =
  "flex min-h-9 flex-wrap items-center gap-x-2 px-3 py-1.5 text-[13px] font-semibold";

/**
 * The strip at the bottom is where the two modes differ: goods that exist now
 * are green on white, a pre-order shows when it closes on orange.
 */
function Foot({ listing }: { listing: ListingSummary }) {
  const t = useTranslations("listings");
  const format = useFormat();
  if (listing.mode === "in_stock") {
    if (listing.stockQuantity === 0) {
      return (
        <p className={cn(FOOT, "border-t border-border text-muted-foreground")}>
          <span aria-hidden="true" className="size-2 rounded-full bg-muted-foreground" />
          {t("outOfStock")}
        </p>
      );
    }
    return (
      <p className={cn(FOOT, "border-t border-border text-positive-deep")}>
        <span aria-hidden="true" className="size-2 rounded-full bg-positive" />
        {t("mode.in_stock")}
        {listing.stockQuantity !== null && (
          <span className="font-normal">
            {" "}
            {t("card.remaining", {
              quantity: format.quantity(listing.stockQuantity),
              unit: listing.minPriceUnit,
            })}
          </span>
        )}
      </p>
    );
  }

  const today = listing.orderDeadline
    ? closesToday(listing.orderDeadline)
    : false;
  return (
    <p
      className={cn(
        FOOT,
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
    <p className="flex flex-wrap gap-x-2 text-[13px] text-muted-foreground">
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

export function ListingCard({
  listing,
  layout = "responsive",
  actions,
}: {
  listing: ListingSummary;
  layout?: CardLayout;
  /**
   * Controls under the card, such as adding to the cart. They sit outside
   * the link, so pressing them never opens the listing.
   */
  actions?: ReactNode;
}) {
  const stacked = layout === "stacked";
  // On phones a responsive card is a row: photo on the left, so long
  // titles and the price keep the full width.
  const photo = stacked
    ? "aspect-[4/3] w-full"
    : "row-span-2 h-full min-h-28 w-full min-[560px]:aspect-[4/3] min-[560px]:h-auto min-[560px]:min-h-0";

  const card = (
    <Link
      href={`/listings/${listing.id}`}
      className={cn(
        "group w-full overflow-hidden border border-border bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        actions ? "rounded-t-lg" : "rounded-lg",
        stacked
          ? "flex flex-col"
          : "grid grid-cols-[112px_minmax(0,1fr)] min-[560px]:flex min-[560px]:flex-col",
      )}
    >
      {listing.thumbnailUrl ? (
        // Served by our own API behind a session cookie, so next/image's
        // optimizer cannot fetch it; the backend already sends a 400px WebP.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={listing.thumbnailUrl}
          alt=""
          loading="lazy"
          className={cn(photo, "object-cover")}
        />
      ) : (
        <ImagePlaceholder className={photo} />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 font-medium group-hover:text-primary">
          {listing.title}
        </h3>
        <p className="leading-tight">
          <Price
            amount={listing.minUnitPrice}
            size={22}
            from
            unit={listing.minPriceUnit}
          />
        </p>
        <Facts listing={listing} />
        <p className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground">
          <UserAvatar
            name={listing.seller.name}
            avatarUrl={listing.seller.avatarUrl}
            size="xs"
          />
          <span className="min-w-0 truncate">{listing.seller.name}</span>
        </p>
      </div>

      <Foot listing={listing} />
    </Link>
  );

  if (!actions) {
    return card;
  }
  return (
    <div className="flex w-full flex-col">
      {card}
      <div className="rounded-b-lg border-x border-b border-border bg-card px-3 py-2">
        {actions}
      </div>
    </div>
  );
}
