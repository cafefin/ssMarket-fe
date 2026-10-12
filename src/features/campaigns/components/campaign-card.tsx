import Link from "next/link";
import { useTranslations } from "next-intl";
import { ImagePlaceholder } from "@/features/listings";
import { formatDate } from "@/shared/lib/format/datetime";
import { closesToday } from "@/shared/lib/format/deadline";
import { useFormat } from "@/shared/lib/format/use-format";
import { cn } from "@/shared/lib/utils";
import { Price } from "@/shared/ui/atoms/price";
import type { CampaignSummary } from "../api/use-campaigns";

/**
 * A pre-order round as one card: a strip of product photos, the title, the
 * seller, how many products and from what price, then when it closes (on an
 * orange strip, like a ticket stub) and when it is delivered.
 */
export function CampaignCard({ campaign }: { campaign: CampaignSummary }) {
  const t = useTranslations("campaigns.card");
  const format = useFormat();
  const today = closesToday(campaign.orderDeadline);
  const photos = campaign.thumbnails.slice(0, 4);

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="group flex w-full flex-col overflow-hidden rounded-lg border border-border bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {photos.length > 0 ? (
        <div className="grid grid-cols-4 gap-px bg-border">
          {photos.map((url, index) => (
            // Served by our own API behind a session cookie, so next/image's
            // optimizer cannot fetch it.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${url}-${index}`}
              src={url}
              alt=""
              loading="lazy"
              decoding="async"
              className="aspect-square w-full bg-surface object-cover"
            />
          ))}
        </div>
      ) : (
        <ImagePlaceholder className="aspect-[4/1] w-full" />
      )}

      <p
        className={cn(
          "px-2.5 py-1.5 text-xs font-semibold",
          today
            ? "bg-deadline text-foreground"
            : "bg-deadline-soft text-deadline-deep",
        )}
      >
        {t("closes", { deadline: format.deadline(campaign.orderDeadline) })}
      </p>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold group-hover:text-primary">
          {campaign.title}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {t("seller", { handle: campaign.seller.handle })}
        </p>
        <p className="flex flex-wrap items-baseline gap-x-1 text-sm">
          <span>{t("items", { count: campaign.itemCount })}</span>
          <span aria-hidden="true">·</span>
          <span>
            {t("from")} <Price amount={campaign.minPrice} size="sm" />
          </span>
        </p>
        <p className="mt-auto pt-0.5 text-xs text-muted-foreground">
          {t("delivery", { date: formatDate(campaign.deliveryDate) })}
        </p>
      </div>
    </Link>
  );
}
