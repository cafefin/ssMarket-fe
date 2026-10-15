"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useUserMessage } from "@/shared/api/use-user-message";
import { formatDateTime } from "@/shared/lib/format/datetime";
import { cn } from "@/shared/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/atoms/shadcn/alert-dialog";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import {
  type CampaignMine,
  useCloseCampaign,
  useDeleteCampaign,
  useMyCampaigns,
  usePublishCampaign,
  useReopenCampaign,
} from "../api/use-my-campaigns";

const TABS = ["open", "draft", "closed"] as const;
type Tab = (typeof TABS)[number];

/** Where a round is listed: a round past its deadline counts as closed. */
function tabOf(campaign: CampaignMine): Tab {
  if (campaign.status === "draft") {
    return "draft";
  }
  return campaign.isOpen ? "open" : "closed";
}

/** The seller's pre-order rounds, with the actions each one allows. */
export function MyCampaigns() {
  const router = useRouter();
  const requested = useSearchParams().get("tab");
  // The tabs are buttons, not links: the list of listings on the same page
  // owns `?tab=`. This list starts on that tab and then follows the buttons.
  const [chosen, setChosen] = useState<Tab | null>(null);
  const tab =
    chosen ?? TABS.find((candidate) => candidate === requested) ?? TABS[0];
  const campaigns = useMyCampaigns();
  const t = useTranslations("sell.campaign.mine");
  const tm = useTranslations("sell.mine");
  const tc = useTranslations("common");
  const userMessage = useUserMessage();
  const publish = usePublishCampaign();
  const close = useCloseCampaign();
  const reopen = useReopenCampaign();
  const remove = useDeleteCampaign();
  const [confirming, setConfirming] = useState<{
    action: "close" | "delete";
    campaign: CampaignMine;
  } | null>(null);

  async function run(
    action: () => Promise<unknown>,
    success: string,
  ): Promise<void> {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  async function reopenRound(id: string): Promise<void> {
    try {
      const draft = await reopen.mutateAsync(id);
      router.push(`/campaigns/${draft.id}/edit?reopened=1`);
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  const shown = campaigns.data?.filter((campaign) => tabOf(campaign) === tab);
  const small = { size: "sm" } as const;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[22px] leading-tight font-semibold">{t("title")}</h2>

      <div
        role="tablist"
        aria-label={t("tabs")}
        className="flex gap-6 border-b border-border"
      >
        {TABS.map((candidate) => {
          const active = candidate === tab;
          return (
            <button
              key={candidate}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setChosen(candidate)}
              className={cn(
                "-mb-px border-b-2 py-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tm(`tab.${candidate}`)}
            </button>
          );
        })}
      </div>

      {campaigns.isPending && (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label={t("loading")}>
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )}

      {campaigns.isError && (
        <div role="alert" className="flex flex-col items-center gap-3 py-8">
          <p className="text-error-deep">{t("loadFailed")}</p>
          <Button variant="outline" onClick={() => void campaigns.refetch()}>
            {tc("retry")}
          </Button>
        </div>
      )}

      {shown?.length === 0 && (
        <p className="py-6 text-center text-muted-foreground">
          {t(`empty.${tab}`)}
        </p>
      )}

      {shown && shown.length > 0 && (
        <ul className="flex flex-col gap-3">
          {shown.map((campaign) => {
            const draft = campaign.status === "draft";
            const closed = campaign.status === "closed";
            const expired = campaign.status === "open" && !campaign.isOpen;
            return (
              <li
                key={campaign.id}
                aria-label={campaign.title}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{campaign.title}</span>
                    {expired && (
                      <span className="rounded-full bg-deadline-soft px-2 py-0.5 text-xs font-medium text-deadline-deep">
                        {t("expired")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("meta", {
                      items: campaign.itemCount,
                      deadline: formatDateTime(campaign.orderDeadline),
                      orders: campaign.orderCount,
                    })}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {campaign.isOpen && (
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className={buttonVariants({ ...small, variant: "ghost" })}
                    >
                      {t("view")}
                    </Link>
                  )}
                  {!draft && (
                    <Link
                      href={`/sell/campaigns/${campaign.id}`}
                      className={buttonVariants({ ...small, variant: "ghost" })}
                    >
                      {t("summary")}
                    </Link>
                  )}
                  {!closed && (
                    <Link
                      href={`/campaigns/${campaign.id}/edit`}
                      className={buttonVariants({ ...small, variant: "outline" })}
                    >
                      {tc("edit")}
                    </Link>
                  )}
                  {draft && (
                    <>
                      <Button
                        {...small}
                        disabled={publish.isPending}
                        onClick={() =>
                          void run(
                            () => publish.mutateAsync(campaign.id),
                            t("published"),
                          )
                        }
                      >
                        {t("publish")}
                      </Button>
                      <Button
                        {...small}
                        variant="outline"
                        onClick={() => setConfirming({ action: "delete", campaign })}
                      >
                        {t("delete")}
                      </Button>
                    </>
                  )}
                  {campaign.status === "open" && (
                    <Button
                      {...small}
                      variant="outline"
                      onClick={() => setConfirming({ action: "close", campaign })}
                    >
                      {t("close")}
                    </Button>
                  )}
                  {(closed || expired) && (
                    <Button
                      {...small}
                      variant="outline"
                      disabled={reopen.isPending}
                      onClick={() => void reopenRound(campaign.id)}
                    >
                      {t("reopen")}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(confirming?.action === "delete" ? "deleteTitle" : "closeTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(confirming?.action === "delete" ? "deleteBody" : "closeBody", {
                title: confirming?.campaign.title ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("no")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={close.isPending || remove.isPending}
              onClick={() => {
                if (confirming?.action === "delete") {
                  void run(
                    () => remove.mutateAsync(confirming.campaign.id),
                    t("deleted"),
                  );
                } else if (confirming) {
                  void run(
                    () => close.mutateAsync(confirming.campaign.id),
                    t("closed"),
                  );
                }
                setConfirming(null);
              }}
            >
              {t(confirming?.action === "delete" ? "delete" : "close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
