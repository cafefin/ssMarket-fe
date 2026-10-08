"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { useCategories } from "../api/use-categories";
import { type ListingSummary, useListings } from "../api/use-listings";
import { isDefault, parseListingFilters } from "../lib/filters";
import { ListingCard } from "./listing-card";
import { ClosingSoonShelf } from "./closing-soon-shelf";
import { ListingFilters } from "./listing-filters";
import { cn } from "@/shared/lib/utils";
import { LISTING_GRID } from "./listing-grid";

/** The shape of a card while it loads: photo, two lines of text, a price. */
function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-0 pb-3">
      <Skeleton className="aspect-square w-full rounded-b-none" />
      <Skeleton className="mx-2.5 h-4 w-4/5" />
      <Skeleton className="mx-2.5 h-4 w-1/2" />
    </div>
  );
}

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
  const filtered = !isDefault(filters);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = listings;

  // Loads the next page when the end of the list comes into view. The
  // "load more" button stays as a fallback (and for browsers without the
  // observer).
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = end.current;
    if (!element || !hasNextPage || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
              <CardSkeleton key={index} />
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
          <ul
            className={cn(
              LISTING_GRID,
              // While new filters load, the old cards stay, dimmed.
              listings.isPlaceholderData && "opacity-60 transition-opacity",
            )}
            aria-busy={listings.isPlaceholderData}
          >
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

        {isFetchingNextPage && (
          <div className={LISTING_GRID} aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
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
      </div>
    </>
  );
}
