"use client";

import Link from "next/link";
import { ListingForm } from "@/components/sell/listing-form";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/lib/api/use-current-user";
import { type ListingDetail, useListing } from "@/lib/api/use-listings";
import { toDateTimeLocal } from "@/lib/format/datetime";
import type { ListingFormValues } from "@/lib/listings/listing-schema";

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
      <ListingForm
        mode={listing.mode}
        initialValues={toFormValues(listing)}
        listing={listing}
      />
    </div>
  );
}
