"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { useCategories } from "../api/use-categories";
import { useListings } from "../api/use-listings";
import { parseListingFilters } from "../lib/filters";
import { ListingCard } from "./listing-card";
import { ClosingSoonShelf } from "./closing-soon-shelf";
import { ListingFilters } from "./listing-filters";
import { LISTING_GRID } from "./listing-grid";

/** The home page: filters from the URL, then the matching listings. */
export function ListingBrowser() {
  const filters = parseListingFilters(useSearchParams());
  const { data: categories = [] } = useCategories();
  const listings = useListings(filters);

  const items = listings.data?.pages.flatMap((page) => page.items) ?? [];
  const filtered = Boolean(filters.q || filters.category || filters.mode);

  return (
    <>
      {!filtered && <ClosingSoonShelf />}
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-8">
        {filters.q ? (
          <h1 className="text-[22px] font-bold">Kết quả cho “{filters.q}”</h1>
        ) : (
          <h2 className="text-[22px] font-bold">Tất cả món đang bán</h2>
        )}

        <ListingFilters filters={filters} categories={categories} />

        {listings.isPending && (
          <div className={LISTING_GRID} aria-busy="true" aria-label="Đang tải bài đăng">
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
              Không tải được danh sách bài đăng.
            </p>
            <Button variant="outline" onClick={() => void listings.refetch()}>
              Thử lại
            </Button>
          </div>
        )}

        {listings.isSuccess && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <h2 className="text-[22px] font-semibold">
              {filters.q
                ? `Không tìm thấy kết quả cho “${filters.q}”`
                : filtered
                  ? "Không có bài đăng nào khớp bộ lọc"
                  : "Chưa có sản phẩm nào"}
            </h2>
            <p className="text-muted-foreground">
              {filtered
                ? "Thử từ khóa khác hoặc bỏ bớt bộ lọc."
                : "Các món đồ đồng nghiệp đăng bán sẽ xuất hiện ở đây."}
            </p>
            {filtered ? (
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                Xóa bộ lọc
              </Link>
            ) : (
              <Link href="/sell/new" className={buttonVariants()}>
                Đăng bán món đầu tiên
              </Link>
            )}
          </div>
        )}

        {items.length > 0 && (
          <ul className={LISTING_GRID}>
            {items.map((listing) => (
              <li key={listing.id} className="flex">
                <ListingCard listing={listing} />
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
              {listings.isFetchingNextPage ? "Đang tải…" : "Xem thêm"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
