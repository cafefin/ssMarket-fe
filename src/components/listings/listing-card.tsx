import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ListingSummary } from "@/lib/api/use-listings";
import { closesToday, formatDeadline } from "@/lib/format/deadline";
import { initials } from "@/lib/format/initials";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { ImagePlaceholder } from "./image-placeholder";

type CardLayout = "responsive" | "stacked";

const FOOT =
  "flex min-h-9 flex-wrap items-center gap-x-2 px-3 py-1.5 text-[13px] font-semibold";

/**
 * The strip at the bottom is where the two modes differ: goods that exist now
 * are green on white, a pre-order shows when it closes on orange.
 */
function Foot({ listing }: { listing: ListingSummary }) {
  if (listing.mode === "in_stock") {
    return (
      <p className={cn(FOOT, "border-t border-border text-positive-deep")}>
        <span aria-hidden="true" className="size-2 rounded-full bg-positive" />
        Có sẵn
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
          ? `Chốt ${formatDeadline(listing.orderDeadline)}`
          : "Đặt trước"}
      </span>
      {listing.orderCount > 0 && (
        <span className="font-normal">{listing.orderCount} người đã đặt</span>
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
  // Vietnamese titles and the price keep the full width.
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
        <p className="font-heading text-[22px] leading-tight font-bold [font-stretch:75%]">
          <span className="font-sans text-[13px] font-normal text-muted-foreground [font-stretch:100%]">
            từ{" "}
          </span>
          {formatMoney(listing.minUnitPrice)}
          <span className="font-sans text-[13px] font-normal text-muted-foreground [font-stretch:100%]">
            /{listing.minPriceUnit}
          </span>
        </p>
        <p className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Avatar aria-hidden="true" className="size-7">
            {listing.seller.avatarUrl && (
              <AvatarImage src={listing.seller.avatarUrl} alt="" />
            )}
            <AvatarFallback className="bg-primary-soft text-[11px] font-semibold text-primary-deep">
              {initials(listing.seller.name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 truncate">{listing.seller.name}</span>
        </p>
      </div>

      <Foot listing={listing} />
    </Link>
  );
}
