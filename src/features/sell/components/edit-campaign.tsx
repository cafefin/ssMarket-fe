"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { useMyCampaign } from "../api/use-my-campaigns";
import { fromCampaign } from "../lib/campaign-schema";
import { CampaignForm } from "./campaign-form";

function Unavailable({ message }: { message: string }) {
  const t = useTranslations("sell.campaign.edit");
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-[22px] font-semibold">{message}</h1>
      <Link href="/sell" className={buttonVariants({ variant: "outline" })}>
        {t("backToSell")}
      </Link>
    </div>
  );
}

/** The seller's edit page of a round that is a draft or open. */
export function EditCampaign({ id }: { id: string }) {
  const { data: campaign, isPending, isError } = useMyCampaign(id);
  const { data: me } = useCurrentUser();
  const reopened = useSearchParams().get("reopened") === "1";
  const t = useTranslations("sell.campaign.edit");
  const locale = useLocale();
  // A save gives new products their ids and turns chosen photos into saved
  // ones. When the seller stays on this page afterwards (a photo failed, or
  // publishing did), the form starts again from the saved round, so the next
  // save does not add those products or upload those photos a second time.
  const [saves, setSaves] = useState(0);

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
  if (isError || !campaign || campaign.seller.id !== me.id) {
    return <Unavailable message={t("notFound")} />;
  }
  if (campaign.status === "closed") {
    return <Unavailable message={t("closed")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] leading-tight font-semibold">{t("title")}</h1>
      {reopened && (
        <p
          role="status"
          className="rounded-md border border-deadline/40 bg-deadline-soft px-4 py-3 text-sm text-deadline-deep"
        >
          {t("reopened")}
        </p>
      )}
      <CampaignForm
        key={saves}
        initialValues={fromCampaign(campaign, locale)}
        campaign={campaign}
        onSaved={() => setSaves((count) => count + 1)}
      />
    </div>
  );
}
