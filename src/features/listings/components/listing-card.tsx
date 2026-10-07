import Link from "next/link";
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

export function ListingCard({
  listing,
  layout = "responsive",
}: {
  listing: ListingSummary;
  layout?: CardLayout;
}) {
  const stacked = layout === "stacked";
  // On phones a responsive card is a row: photo on the left, so long
  // titles and the price keep the full width.
  const photo = stacked
    ? "aspect-[4/3] w-full"
    : "row-span-2 h-full min-h-28 w-full min-[560px]:aspect-[4/3] min-[560px]:h-auto min-[560px]:min-h-0";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={cn(
        "group w-full overflow-hidden rounded-lg border border-border bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
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
}
