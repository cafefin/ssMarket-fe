"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ModeBadge, type ListingDetail, type ListingStatus, useCloseListing, useMyListings, usePublishListing, useReopenListing } from "@/features/listings";
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
import { useUserMessage } from "@/shared/api/use-user-message";
import type { Translator } from "@/shared/i18n/translator";
import { formatDateTime } from "@/shared/lib/format/datetime";
import { useFormat } from "@/shared/lib/format/use-format";
import { cn } from "@/shared/lib/utils";

const TABS: readonly ListingStatus[] = ["open", "draft", "closed"];

function cheapest(listing: ListingDetail) {
  return listing.items.reduce((low, current) =>
    current.unitPrice < low.unitPrice ? current : low,
  );
}

function when(
  listing: ListingDetail,
  t: Translator<"sell.mine">,
): string | null {
  if (listing.orderDeadline) {
    return t("closes", { time: formatDateTime(listing.orderDeadline) });
  }
  return listing.publishedAt
    ? t("publishedAt", { time: formatDateTime(listing.publishedAt) })
    : null;
}

export function MyListings() {
  const requested = useSearchParams().get("tab");
  const tab = TABS.find((candidate) => candidate === requested) ?? TABS[0];
  const listings = useMyListings(tab);
  const t = useTranslations("sell.mine");
  const ts = useTranslations("sell");
  const tc = useTranslations("common");
  const format = useFormat();
  const userMessage = useUserMessage();
  const publish = usePublishListing();
  const close = useCloseListing();
  const reopen = useReopenListing();
  const router = useRouter();

  async function reopenRound(id: string): Promise<void> {
    try {
      const draft = await reopen.mutateAsync(id);
      // Straight to the form: the dates are only a suggestion to review.
      router.push(`/listings/${draft.id}/edit?reopened=1`);
    } catch (error) {
      toast.error(userMessage(error));
    }
  }
  const [closing, setClosing] = useState<ListingDetail | null>(null);

  async function run(
    action: typeof publish,
    id: string,
    success: string,
  ): Promise<void> {
    try {
      await action.mutateAsync(id);
      toast.success(success);
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  const small = { size: "sm" } as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-semibold">
          {t("title")}
        </h1>
        <Link href="/sell/new" className={buttonVariants()}>
          {ts("title")}
        </Link>
      </div>

      <nav aria-label={t("tabs")} className="flex gap-6 border-b border-border">
        {TABS.map((candidate) => {
          const active = candidate === tab;
          return (
            <Link
              key={candidate}
              href={`/sell?tab=${candidate}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 py-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`tab.${candidate}`)}
            </Link>
          );
        })}
      </nav>

      {listings.isPending && (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label={t("loading")}>
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )}

      {listings.isError && (
        <div role="alert" className="flex flex-col items-center gap-3 py-12">
          <p className="text-error-deep">{t("loadFailed")}</p>
          <Button variant="outline" onClick={() => void listings.refetch()}>
            {tc("retry")}
          </Button>
        </div>
      )}

      {listings.data?.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-muted-foreground">{t(`empty.${tab}`)}</p>
          <Link href="/sell/new" className={buttonVariants({ variant: "outline" })}>
            {ts("title")}
          </Link>
        </div>
      )}

      {listings.data && listings.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {listings.data.map((listing) => {
            const expired = listing.status === "open" && !listing.isOpen;
            const low = cheapest(listing);
            const time = when(listing, t);
            return (
              <li
                key={listing.id}
                aria-label={listing.title}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{listing.title}</span>
                    <ModeBadge mode={listing.mode} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("itemCount", { count: listing.items.length })} ·{" "}
                    {t("from", {
                      price: format.money(low.unitPrice),
                      unit: low.unit,
                    })}
                    {time && ` · ${time}`}
                  </p>
                  {expired && (
                    <p className="text-sm text-warn-deep">
                      {t("expired")}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/listings/${listing.id}`}
                    className={buttonVariants({ ...small, variant: "ghost" })}
                  >
                    {t("view")}
                  </Link>
                  {listing.status !== "draft" && (
                    <Link
                      href={`/sell/listings/${listing.id}`}
                      className={buttonVariants({ ...small, variant: "ghost" })}
                    >
                      {t("summary")}
                    </Link>
                  )}
                  {listing.status !== "closed" && (
                    <Link
                      href={`/listings/${listing.id}/edit`}
                      className={buttonVariants({ ...small, variant: "outline" })}
                    >
                      {tc("edit")}
                    </Link>
                  )}
                  {listing.status === "draft" && (
                    <Button
                      {...small}
                      disabled={publish.isPending}
                      onClick={() =>
                        void run(publish, listing.id, ts("form.published"))
                      }
                    >
                      {ts("form.publish")}
                    </Button>
                  )}
                  {listing.mode === "preorder" &&
                    (listing.status === "closed" || expired) && (
                      <Button
                        {...small}
                        disabled={reopen.isPending}
                        onClick={() => void reopenRound(listing.id)}
                      >
                        {t("reopen")}
                      </Button>
                    )}
                  {listing.status === "open" && (
                    <Button
                      {...small}
                      variant="outline"
                      onClick={() => setClosing(listing)}
                    >
                      {t("close")}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={closing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setClosing(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("closeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("closeBody", { title: closing?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("no")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={close.isPending}
              onClick={() => {
                if (closing) {
                  void run(close, closing.id, t("closed"));
                }
                setClosing(null);
              }}
            >
              {t("close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
