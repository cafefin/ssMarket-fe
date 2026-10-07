"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ListingCard, LISTING_GRID, useSellerListings } from "@/features/listings";
import { UserAvatar } from "@/shared/ui/molecules/user-avatar";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { ApiError } from "@/shared/api/api-error";
import { useUserMessage } from "@/shared/api/use-user-message";
import { usePublicUser } from "@/shared/api/use-public-user";

const WRAPPER = "mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8";

/** A seller's public page: who they are and what they have open. */
export function SellerProfile({ sellerId }: { sellerId: string }) {
  const user = usePublicUser(sellerId);
  const listings = useSellerListings(sellerId);
  const t = useTranslations("sellers");
  const tc = useTranslations("common");
  const tl = useTranslations("listings.browser");
  const userMessage = useUserMessage();

  if (user.isError) {
    const notFound =
      user.error instanceof ApiError && user.error.status === 404;
    return (
      <div className={WRAPPER}>
        <div className="flex flex-col items-center gap-3 py-16">
          <p role="alert" className="text-error-deep">
            {notFound
              ? t("notFound")
              : userMessage(user.error)}
          </p>
          {!notFound && (
            <Button variant="outline" onClick={() => void user.refetch()}>
              {tc("retry")}
            </Button>
          )}
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            {tc("backHome")}
          </Link>
        </div>
      </div>
    );
  }

  const items = listings.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className={WRAPPER}>
      {user.isPending ? (
        <Skeleton className="h-16 w-64" aria-label={t("loading")} />
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
                {t("deliversAt", { location: user.data.deliveryLocation })}
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
          {t("selling")}
        </h2>

        {listings.isPending && (
          <div
            className={LISTING_GRID}
            aria-busy="true"
            aria-label={tl("loading")}
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
              {tl("loadFailed")}
            </p>
            <Button variant="outline" onClick={() => void listings.refetch()}>
              {tc("retry")}
            </Button>
          </div>
        )}

        {listings.isSuccess && items.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">
            {t("empty")}
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
              {tc("loadMore")}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
