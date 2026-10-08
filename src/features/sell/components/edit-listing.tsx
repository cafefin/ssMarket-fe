"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/shared/i18n/config";
import { ListingForm } from "./listing-form";
import { buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { type ListingDetail, useListing } from "@/features/listings";
import { toDateTimeLocal } from "@/shared/lib/format/datetime";
import type { ListingFormValues } from "../lib/listing-schema";

const PRICE_FORMATTERS: Record<Locale, Intl.NumberFormat> = {
  vi: new Intl.NumberFormat("vi-VN"),
  en: new Intl.NumberFormat("en-US"),
};

/** A listing as form values; prices are written the way `locale` groups digits. */
export function toFormValues(
  listing: ListingDetail,
  locale: Locale,
): ListingFormValues {
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
    condition: listing.condition ?? "",
    unit: listing.unit,
    unitPrice: PRICE_FORMATTERS[locale].format(listing.unitPrice),
    stockQuantity:
      listing.stockQuantity === null ? "" : String(listing.stockQuantity),
    combos: listing.combos.map((combo) => ({
      quantity: combo.quantity,
      price: PRICE_FORMATTERS[locale].format(combo.price),
    })),
  };
}

function Unavailable({ message }: { message: string }) {
  const t = useTranslations("sell.edit");
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-[22px] font-semibold">{message}</h1>
      <Link href="/sell" className={buttonVariants({ variant: "outline" })}>
        {t("backToMine")}
      </Link>
    </div>
  );
}

export function EditListing({ id }: { id: string }) {
  const { data: listing, isPending, isError } = useListing(id);
  const { data: me } = useCurrentUser();
  const reopened = useSearchParams().get("reopened") === "1";
  const t = useTranslations("sell.edit");
  const locale = useLocale();

  if (isPending || !me) {
    if (isError) {
      return <Unavailable message={t("notFound")} />;
    }
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (isError || !listing || listing.seller.id !== me.id) {
    return <Unavailable message={t("notFound")} />;
  }
  if (listing.status === "closed") {
    return <Unavailable message={t("closed")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] leading-tight font-semibold">{t("title")}</h1>
      {reopened && listing.status === "draft" && (
        <p className="rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn-deep">
          {t("reopened")}
        </p>
      )}
      <ListingForm
        mode={listing.mode}
        initialValues={toFormValues(listing, locale)}
        listing={listing}
      />
    </div>
  );
}
