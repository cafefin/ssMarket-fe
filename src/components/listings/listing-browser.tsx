"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/lib/api/use-categories";
import { useListings } from "@/lib/api/use-listings";
import { parseListingFilters } from "@/lib/listings/filters";
import { ListingCard } from "./listing-card";
import { ListingFilters } from "./listing-filters";

const GRID =
  "grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

/** The home page: filters from the URL, then the matching listings. */
export function ListingBrowser() {
  const filters = parseListingFilters(useSearchParams());
  const { data: categories = [] } = useCategories();
  const listings = useListings(filters);

  const items = listings.data?.pages.flatMap((page) => page.items) ?? [];
  const filtered = Boolean(filters.q || filters.category || filters.mode);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8">
      <ListingFilters filters={filters} categories={categories} />

      {filters.q && (
        <h1 className="text-lg font-semibold">Kết quả cho “{filters.q}”</h1>
      )}

      {listings.isPending && (
        <div className={GRID} aria-busy="true" aria-label="Đang tải bài đăng">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="aspect-[4/5] w-full rounded-lg" />
          ))}
        </div>
      )}

      {listings.isError && (
        <div role="alert" className="flex flex-col items-center gap-3 py-16">
          <p className="text-error-deep">Không tải được danh sách bài đăng.</p>
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
        <ul className={GRID}>
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
  );
}
