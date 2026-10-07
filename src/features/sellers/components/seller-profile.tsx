"use client";

import Link from "next/link";
import { ListingCard, LISTING_GRID, useSellerListings } from "@/features/listings";
import { UserAvatar } from "@/shared/ui/molecules/user-avatar";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { ApiError, userMessage } from "@/shared/api/api-error";
import { usePublicUser } from "@/shared/api/use-public-user";

const WRAPPER = "mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8";

/** A seller's public page: who they are and what they have open. */
export function SellerProfile({ sellerId }: { sellerId: string }) {
  const user = usePublicUser(sellerId);
  const listings = useSellerListings(sellerId);

  if (user.isError) {
    const notFound =
      user.error instanceof ApiError && user.error.status === 404;
    return (
      <div className={WRAPPER}>
        <div className="flex flex-col items-center gap-3 py-16">
          <p role="alert" className="text-error-deep">
            {notFound
              ? "Không tìm thấy người bán này."
              : userMessage(user.error)}
          </p>
          {!notFound && (
            <Button variant="outline" onClick={() => void user.refetch()}>
              Thử lại
            </Button>
          )}
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const items = listings.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className={WRAPPER}>
      {user.isPending ? (
        <Skeleton className="h-16 w-64" aria-label="Đang tải người bán" />
      ) : (
        <header className="flex items-center gap-4">
          <UserAvatar
            name={user.data.name}
            avatarUrl={user.data.avatarUrl}
            size="lg"
          />
          <div className="flex min-w-0 flex-col">
            <h1 className="text-[28px] leading-tight font-bold">
              {user.data.name}
            </h1>
            {user.data.deliveryLocation && (
              <p className="text-muted-foreground">
                Giao tại {user.data.deliveryLocation}
              </p>
            )}
          </div>
        </header>
      )}

      <section
        aria-labelledby="selling-heading"
        className="flex flex-col gap-6"
      >
        <h2 id="selling-heading" className="text-[22px] font-bold">
          Đang bán
        </h2>

        {listings.isPending && (
          <div
            className={LISTING_GRID}
            aria-busy="true"
            aria-label="Đang tải bài đăng"
          >
            {Array.from({ length: 4 }, (_, index) => (
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
          <p className="py-16 text-center text-muted-foreground">
            Người bán này chưa có món nào đang bán.
          </p>
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
              Xem thêm
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
