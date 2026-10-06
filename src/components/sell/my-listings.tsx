"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ModeBadge } from "@/components/listings/mode-badge";
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
import { userMessage } from "@/shared/api/api-error";
import type { ListingDetail } from "@/lib/api/use-listings";
import {
  type ListingStatus,
  useCloseListing,
  useMyListings,
  usePublishListing,
  useReopenListing,
} from "@/lib/api/use-my-listings";
import { formatDateTime } from "@/shared/lib/format/datetime";
import { formatMoney } from "@/shared/lib/format/money";
import { cn } from "@/shared/lib/utils";

const TABS: { status: ListingStatus; label: string; empty: string }[] = [
  { status: "open", label: "Đang mở", empty: "Bạn chưa có bài đăng nào đang mở." },
  { status: "draft", label: "Nháp", empty: "Bạn không có bản nháp nào." },
  { status: "closed", label: "Đã đóng", empty: "Bạn chưa đóng bài đăng nào." },
];

function cheapest(listing: ListingDetail): string {
  const item = listing.items.reduce((low, current) =>
    current.unitPrice < low.unitPrice ? current : low,
  );
  return `từ ${formatMoney(item.unitPrice)}/${item.unit}`;
}

function when(listing: ListingDetail): string | null {
  if (listing.orderDeadline) {
    return `Chốt đơn ${formatDateTime(listing.orderDeadline)}`;
  }
  return listing.publishedAt
    ? `Đăng lúc ${formatDateTime(listing.publishedAt)}`
    : null;
}

export function MyListings() {
  const requested = useSearchParams().get("tab");
  const tab = TABS.find((candidate) => candidate.status === requested) ?? TABS[0];
  const listings = useMyListings(tab.status);
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
          Bài đăng của tôi
        </h1>
        <Link href="/sell/new" className={buttonVariants()}>
          Đăng bán
        </Link>
      </div>

      <nav aria-label="Trạng thái bài đăng" className="flex gap-6 border-b border-border">
        {TABS.map((candidate) => {
          const active = candidate.status === tab.status;
          return (
            <Link
              key={candidate.status}
              href={`/sell?tab=${candidate.status}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 py-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {candidate.label}
            </Link>
          );
        })}
      </nav>

      {listings.isPending && (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải bài đăng">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )}

      {listings.isError && (
        <div role="alert" className="flex flex-col items-center gap-3 py-12">
          <p className="text-error-deep">Không tải được bài đăng của bạn.</p>
          <Button variant="outline" onClick={() => void listings.refetch()}>
            Thử lại
          </Button>
        </div>
      )}

      {listings.data?.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-muted-foreground">{tab.empty}</p>
          <Link href="/sell/new" className={buttonVariants({ variant: "outline" })}>
            Đăng bán
          </Link>
        </div>
      )}

      {listings.data && listings.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {listings.data.map((listing) => {
            const expired = listing.status === "open" && !listing.isOpen;
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
                    {listing.items.length} mặt hàng · {cheapest(listing)}
                    {when(listing) && ` · ${when(listing)}`}
                  </p>
                  {expired && (
                    <p className="text-sm text-warn-deep">
                      Đã quá hạn chốt. Người mua không còn nhìn thấy bài này.
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/listings/${listing.id}`}
                    className={buttonVariants({ ...small, variant: "ghost" })}
                  >
                    Xem
                  </Link>
                  {listing.status !== "draft" && (
                    <Link
                      href={`/sell/listings/${listing.id}`}
                      className={buttonVariants({ ...small, variant: "ghost" })}
                    >
                      Tổng hợp
                    </Link>
                  )}
                  {listing.status !== "closed" && (
                    <Link
                      href={`/listings/${listing.id}/edit`}
                      className={buttonVariants({ ...small, variant: "outline" })}
                    >
                      Sửa
                    </Link>
                  )}
                  {listing.status === "draft" && (
                    <Button
                      {...small}
                      disabled={publish.isPending}
                      onClick={() => void run(publish, listing.id, "Đã đăng bán")}
                    >
                      Đăng bán
                    </Button>
                  )}
                  {listing.mode === "preorder" &&
                    (listing.status === "closed" || expired) && (
                      <Button
                        {...small}
                        disabled={reopen.isPending}
                        onClick={() => void reopenRound(listing.id)}
                      >
                        Mở lại
                      </Button>
                    )}
                  {listing.status === "open" && (
                    <Button
                      {...small}
                      variant="outline"
                      onClick={() => setClosing(listing)}
                    >
                      Đóng bài
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
            <AlertDialogTitle>Đóng bài đăng?</AlertDialogTitle>
            <AlertDialogDescription>
              “{closing?.title}” sẽ không còn hiện với người mua. Bài đã đóng
              không mở lại và không sửa được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              disabled={close.isPending}
              onClick={() => {
                if (closing) {
                  void run(close, closing.id, "Đã đóng bài đăng");
                }
                setClosing(null);
              }}
            >
              Đóng bài
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
