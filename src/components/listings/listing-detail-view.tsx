"use client";

import Link from "next/link";
import { OrderPanel } from "@/components/orders/order-panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/atoms/shadcn/avatar";
import { buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { ApiError } from "@/shared/api/api-error";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { type ListingDetail, useListing } from "@/lib/api/use-listings";
import { formatDate } from "@/shared/lib/format/datetime";
import { formatDeadline } from "@/shared/lib/format/deadline";
import { initials } from "@/shared/lib/format/initials";
import { ImageGallery } from "./image-gallery";
import { ItemTable } from "./item-table";
import { ModeBadge } from "./mode-badge";

function ListingNotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-24 text-center">
      <h1 className="text-[22px] font-semibold">Không tìm thấy bài đăng</h1>
      <p className="text-muted-foreground">
        Bài đăng có thể đã đóng, đã hết hạn chốt đơn hoặc không tồn tại.
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Về trang chủ
      </Link>
    </div>
  );
}

function ownerNote(listing: ListingDetail): string | null {
  if (listing.status === "draft") {
    return "Bài đăng đang là bản nháp. Chỉ bạn nhìn thấy nó.";
  }
  if (listing.status === "closed") {
    return "Bài đăng đã đóng. Chỉ bạn nhìn thấy nó.";
  }
  if (!listing.isOpen) {
    return "Đã quá hạn chốt đơn. Người khác không còn nhìn thấy bài đăng này.";
  }
  return null;
}

function paymentMethods(listing: ListingDetail): string {
  return [
    listing.acceptsPrepaidQr && "Chuyển khoản trước qua mã QR",
    listing.acceptsPayOnDelivery && "Trả tiền khi nhận hàng",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function ListingDetailView({ id }: { id: string }) {
  const { data: listing, error, isPending, refetch } = useListing(id);
  const { data: me } = useCurrentUser();

  if (isPending) {
    return (
      <div
        className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-8 md:grid-cols-2"
        aria-busy="true"
        aria-label="Đang tải bài đăng"
      >
        <Skeleton className="aspect-[4/3] w-full rounded-lg" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    if (error instanceof ApiError && [400, 404].includes(error.status)) {
      return <ListingNotFound />;
    }
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-24">
        <p className="text-error-deep">Không tải được bài đăng.</p>
        <button
          type="button"
          className={buttonVariants({ variant: "outline" })}
          onClick={() => void refetch()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  const isOwner = me?.id === listing.seller.id;
  const note = isOwner ? ownerNote(listing) : null;

  return (
    <article className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-8 md:grid-cols-2">
      <ImageGallery images={listing.images} title={listing.title} />

      <div className="flex flex-col gap-6">
        {note && (
          <p className="rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn-deep">
            {note}
          </p>
        )}

        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ModeBadge mode={listing.mode} />
            <span className="text-sm text-muted-foreground">
              {listing.category.name}
            </span>
          </div>
          <h1 className="text-[28px] leading-tight font-bold md:text-4xl">
            {listing.title}
          </h1>
          <div className="flex items-center gap-3">
            <Avatar aria-hidden="true" size="lg">
              {listing.seller.avatarUrl && (
                <AvatarImage src={listing.seller.avatarUrl} alt="" />
              )}
              <AvatarFallback className="bg-primary-soft font-semibold text-primary-deep">
                {initials(listing.seller.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="text-sm text-muted-foreground">
                Người bán:{" "}
                <span className="text-foreground">{listing.seller.name}</span>
              </p>
              <Link
                href={`/sellers/${listing.seller.id}`}
                className="text-[13px] text-primary underline-offset-4 hover:underline"
              >
                Xem trang người bán
              </Link>
            </div>
          </div>
        </header>

        {listing.mode === "preorder" &&
          listing.orderDeadline &&
          listing.deliveryDate && (
            <dl className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 rounded-md bg-deadline-soft p-4 text-sm">
              <div>
                <dt className="text-deadline-deep">Chốt đơn</dt>
                <dd className="font-heading text-[22px] leading-tight font-bold text-deadline-deep">
                  {formatDeadline(listing.orderDeadline)}
                </dd>
              </div>
              <div>
                <dt className="text-deadline-deep">Ngày giao</dt>
                <dd className="font-semibold">
                  {formatDate(listing.deliveryDate)}
                </dd>
              </div>
              {listing.orderCount > 0 && (
                <div className="min-[560px]:col-span-2">
                  <dt className="sr-only">Số người đã đặt</dt>
                  <dd className="font-medium text-deadline-deep">
                    {listing.orderCount} người đã đặt
                  </dd>
                </div>
              )}
            </dl>
          )}

        <ItemTable items={listing.items} mode={listing.mode} />

        <section className="flex flex-col gap-1 text-sm">
          <h2 className="font-semibold">Thanh toán</h2>
          <p className="text-muted-foreground">{paymentMethods(listing)}</p>
        </section>

        {listing.description && (
          <section className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">Mô tả</h2>
            <p className="whitespace-pre-line">{listing.description}</p>
          </section>
        )}

        {/* The seller manages; everyone else can order while it is open. */}
        {isOwner ? (
          <div className="flex flex-wrap gap-3">
            {listing.status !== "closed" && (
              <Link
                href={`/listings/${listing.id}/edit`}
                className={buttonVariants({ variant: "outline" })}
              >
                Sửa bài đăng
              </Link>
            )}
            {listing.status !== "draft" && (
              <Link
                href={`/sell/listings/${listing.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                Bảng tổng hợp đơn hàng
              </Link>
            )}
          </div>
        ) : (
          me && listing.isOpen && <OrderPanel listing={listing} />
        )}
      </div>
    </article>
  );
}
