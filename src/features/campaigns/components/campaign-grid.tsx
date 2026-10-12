"use client";

import { useTranslations } from "next-intl";
import { FilterLink } from "@/features/listings";
import { useLoadMoreOnView } from "@/shared/lib/use-load-more-on-view";
import { cn } from "@/shared/lib/utils";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { type CampaignFilters, useCampaigns } from "../api/use-campaigns";
import { CampaignCard } from "./campaign-card";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border pb-3">
      <Skeleton className="aspect-[4/1] w-full rounded-b-none" />
      <Skeleton className="mx-2.5 h-4 w-4/5" />
      <Skeleton className="mx-2.5 h-4 w-1/2" />
    </div>
  );
}

/** The rounds that match the filters, loaded a page at a time. */
export function CampaignGrid({ filters }: { filters: CampaignFilters }) {
  const t = useTranslations("campaigns.grid");
  const tc = useTranslations("common");
  const campaigns = useCampaigns(filters);

  const items = campaigns.data?.pages.flatMap((page) => page.items) ?? [];
  const filtered =
    filters.q !== "" ||
    filters.category !== null ||
    filters.minPrice !== null ||
    filters.maxPrice !== null;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = campaigns;

  // Loads the next page when the end of the list comes into view; the
  // button stays as a fallback.
  const end = useLoadMoreOnView<HTMLDivElement>({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  return (
    <>
      {campaigns.isPending && (
        <div className={GRID} aria-busy="true" aria-label={t("loading")}>
          {Array.from({ length: 6 }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      )}

      {campaigns.isError && (
        <div role="alert" className="flex flex-col items-center gap-3 py-16">
          <p className="text-error-deep">{t("loadFailed")}</p>
          <Button variant="outline" onClick={() => void campaigns.refetch()}>
            {tc("retry")}
          </Button>
        </div>
      )}

      {campaigns.isSuccess && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <h2 className="text-[22px] font-semibold">
            {filtered ? t("noMatch") : t("empty")}
          </h2>
          <p className="text-muted-foreground">
            {filtered ? t("tryOther") : t("emptyHint")}
          </p>
          {filtered && (
            <FilterLink
              href="/?mode=campaign"
              className={buttonVariants({ variant: "outline" })}
            >
              {t("clearFilters")}
            </FilterLink>
          )}
        </div>
      )}

      {items.length > 0 && (
        <ul
          className={cn(
            GRID,
            // While new filters load, the old cards stay, dimmed.
            campaigns.isPlaceholderData && "opacity-60 transition-opacity",
          )}
          aria-busy={campaigns.isPlaceholderData}
        >
          {items.map((campaign) => (
            <li key={campaign.id} className="flex">
              <CampaignCard campaign={campaign} />
            </li>
          ))}
        </ul>
      )}

      {isFetchingNextPage && (
        <div className={GRID} aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div ref={end} className="flex justify-center">
          <Button
            variant="outline"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? tc("loading") : tc("loadMore")}
          </Button>
        </div>
      )}
    </>
  );
}
