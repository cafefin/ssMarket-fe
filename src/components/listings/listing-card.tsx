import Link from "next/link";
import type { ListingSummary } from "@/lib/api/use-listings";
import { formatDateTime } from "@/lib/format/datetime";
import { formatMoney } from "@/lib/format/money";
import { ImagePlaceholder } from "./image-placeholder";
import { ModeBadge } from "./mode-badge";

export function ListingCard({ listing }: { listing: ListingSummary }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex w-full flex-col overflow-hidden rounded-lg border border-border bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {listing.thumbnailUrl ? (
        // Served by our own API behind a session cookie, so next/image's
        // optimizer cannot fetch it; the backend already sends a 400px WebP.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={listing.thumbnailUrl}
          alt=""
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <ImagePlaceholder className="aspect-[4/3] w-full" />
      )}

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 font-medium group-hover:text-primary">
          {listing.title}
        </h3>
        <p className="font-semibold">
          từ {formatMoney(listing.minUnitPrice)}/{listing.minPriceUnit}
        </p>
        <p className="text-sm text-muted-foreground">{listing.seller.name}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <ModeBadge mode={listing.mode} />
          {listing.orderDeadline && (
            <span className="text-[13px] text-muted-foreground">
              Chốt đơn {formatDateTime(listing.orderDeadline)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
