"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { MyCampaigns } from "./my-campaigns";
import { MyListings } from "./my-listings";

/**
 * The seller's page: its title and the way to sell something new, then a
 * section for the pre-order rounds and one for the listings.
 */
export function MySelling() {
  const t = useTranslations("sell");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-semibold">
          {t("mine.pageTitle")}
        </h1>
        <Link href="/sell/new" className={buttonVariants()}>
          {t("title")}
        </Link>
      </div>
      <div className="flex flex-col gap-12">
        <MyCampaigns />
        <MyListings />
      </div>
    </div>
  );
}
