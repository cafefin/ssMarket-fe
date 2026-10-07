"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { useCategories } from "../api/use-categories";
import { type ListingSummary, useListings } from "../api/use-listings";
import { parseListingFilters } from "../lib/filters";
import { ListingCard } from "./listing-card";
import { ClosingSoonShelf } from "./closing-soon-shelf";
import { ListingFilters } from "./listing-filters";
import { LISTING_GRID } from "./listing-grid";

/** The home page: filters from the URL, then the matching listings. */
export function ListingBrowser({
  renderCardActions,
}: {
  /** Controls under each card; the page passes the cart's, see app/. */
  renderCardActions?: (listing: ListingSummary) => ReactNode;
} = {}) {
  const t = useTranslations("listings.browser");
  const tc = useTranslations("common");
  const filters = parseListingFilters(useSearchParams());
  const { data: categories = [] } = useCategories();
  const listings = useListings(filters);

  const items = listings.data?.pages.flatMap((page) => page.items) ?? [];
  const filtered = Boolean(
    filters.q ||
      filters.category ||
      filters.mode ||
      filters.minPrice !== null ||
      filters.maxPrice !== null ||
      filters.minCondition,
  );

  return (
    <>
      {!filtered && <ClosingSoonShelf />}
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-8">
        {filters.q ? (
          <h1 className="text-[22px] font-bold">
            {t("resultsFor", { query: filters.q })}
          </h1>
        ) : (
          <h2 className="text-[22px] font-bold">{t("all")}</h2>
        )}

        <ListingFilters filters={filters} categories={categories} />

        {listings.isPending && (
          <div className={LISTING_GRID} aria-busy="true" aria-label={t("loading")}>
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton
                key={index}
                className="h-32 w-full rounded-lg min-[560px]:aspect-[4/5] min-[560px]:h-auto"
              />
            ))}
          </div>
        )}

        {listings.isError && (
          <div role="alert" className="flex flex-col items-center gap-3 py-16">
            <p className="text-error-deep">
              {t("loadFailed")}
            </p>
            <Button variant="outline" onClick={() => void listings.refetch()}>
              {tc("retry")}
            </Button>
          </div>
        )}

        {listings.isSuccess && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <h2 className="text-[22px] font-semibold">
              {filters.q
                ? t("noResultsFor", { query: filters.q })
                : filtered
                  ? t("noMatch")
                  : t("empty")}
            </h2>
            <p className="text-muted-foreground">
              {filtered
                ? t("tryOther")
                : t("emptyHint")}
            </p>
            {filtered ? (
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                {t("clearFilters")}
              </Link>
            ) : (
              <Link href="/sell/new" className={buttonVariants()}>
                {t("sellFirst")}
              </Link>
            )}
          </div>
        )}

        {items.length > 0 && (
          <ul className={LISTING_GRID}>
            {items.map((listing) => (
              <li key={listing.id} className="flex">
                <ListingCard
                  listing={listing}
                  actions={renderCardActions?.(listing)}
                />
              </li>
            ))}
          </ul>
        )}

        {listings.hasNextPage && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              disabled={listings.isFetchingNextPage}
              onClick={() => void listings.fetchNextPage()}
            >
              {listings.isFetchingNextPage ? tc("loading") : tc("loadMore")}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
