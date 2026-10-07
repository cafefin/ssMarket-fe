"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ListingForm } from "./listing-form";
import { buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { type ListingDetail, useListing } from "@/features/listings";
import { toDateTimeLocal } from "@/shared/lib/format/datetime";
import type { ListingFormValues } from "../lib/listing-schema";

const priceFormatter = new Intl.NumberFormat("vi-VN");

export function toFormValues(listing: ListingDetail): ListingFormValues {
  return {
    title: listing.title,
    categoryId: String(listing.category.id),
    description: listing.description,
    acceptsPrepaidQr: listing.acceptsPrepaidQr,
    acceptsPayOnDelivery: listing.acceptsPayOnDelivery,
    orderDeadline: listing.orderDeadline
      ? toDateTimeLocal(listing.orderDeadline)
      : "",
    deliveryDate: listing.deliveryDate ?? "",
    items: listing.items.map((item) => ({
      // Keeping the id lets the backend update the item in place, so orders
      // that already reference it stay valid.
      id: item.id,
      name: item.name,
      unit: item.unit,
      unitPrice: priceFormatter.format(item.unitPrice),
      stockQuantity:
        item.stockQuantity === null ? "" : String(item.stockQuantity),
    })),
  };
}

function Unavailable({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-[22px] font-semibold">{message}</h1>
      <Link href="/sell" className={buttonVariants({ variant: "outline" })}>
        Về bài đăng của tôi
      </Link>
    </div>
  );
}

export function EditListing({ id }: { id: string }) {
  const { data: listing, isPending, isError } = useListing(id);
  const { data: me } = useCurrentUser();
  const reopened = useSearchParams().get("reopened") === "1";

  if (isPending || !me) {
    if (isError) {
      return <Unavailable message="Không tìm thấy bài đăng" />;
    }
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Đang tải bài đăng">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (isError || !listing || listing.seller.id !== me.id) {
    return <Unavailable message="Không tìm thấy bài đăng" />;
  }
  if (listing.status === "closed") {
    return <Unavailable message="Bài đăng đã đóng nên không sửa được" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] leading-tight font-semibold">Sửa bài đăng</h1>
      {reopened && listing.status === "draft" && (
        <p className="rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn-deep">
          Đây là bản sao của đợt trước. Kiểm tra hạn chốt, ngày giao và giá
          trước khi đăng.
        </p>
      )}
      <ListingForm
        mode={listing.mode}
        initialValues={toFormValues(listing)}
        listing={listing}
      />
    </div>
  );
}
