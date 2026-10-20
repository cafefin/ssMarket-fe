"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFormat } from "@/shared/lib/format/use-format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import {
  useMarkAllRead,
  useMarkRead,
  useNotificationList,
} from "../api/use-notifications";
import { type Notification, notificationText } from "../lib/notification-text";

/** The panel's content: the notifications, newest first. Mount it only while open. */
export function NotificationList({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations("notifications");
  const format = useFormat();
  const router = useRouter();
  const list = useNotificationList(true);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const hasUnread = items.some((n) => !n.readAt);

  function open(n: Notification, href: string | null) {
    if (!n.readAt) {
      markRead.mutate(n.id);
    }
    if (href) {
      router.push(href);
      onNavigate();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-2">
        <h2 className="text-base">{t("title")}</h2>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => markAllRead.mutate()}
          >
            {t("markAllRead")}
          </Button>
        )}
      </div>

      {list.isPending && (
        <div className="flex flex-col gap-2 px-2" aria-hidden="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {list.isError && (
        <div className="flex flex-col items-start gap-2 px-2 pb-2">
          <p className="text-sm text-muted-foreground">{t("loadError")}</p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => list.refetch()}
          >
            {t("retry")}
          </Button>
        </div>
      )}

      {list.isSuccess && items.length === 0 && (
        <p className="px-2 pb-2 text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col gap-1">
          {items.map((n) => {
            const { key, values, href } = notificationText(n);
            const unread = !n.readAt;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => open(n, href)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                    unread && "bg-primary-soft/40",
                  )}
                >
                  <span className="mt-1.5 flex size-2 shrink-0">
                    {unread && (
                      <>
                        <span
                          aria-hidden="true"
                          className="size-2 rounded-full bg-primary"
                        />
                        <span className="sr-only">{t("unread")}</span>
                      </>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm break-words text-foreground">
                      {t(`text.${key}`, {
                        ...values,
                        total: format.money(values.total),
                      })}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {format.relativeTime(n.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {list.hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="self-center rounded-full"
          disabled={list.isFetchingNextPage}
          onClick={() => list.fetchNextPage()}
        >
          {t("more")}
        </Button>
      )}
    </div>
  );
}
