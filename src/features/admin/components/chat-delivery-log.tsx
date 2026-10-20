"use client";

import { useTranslations } from "next-intl";
import { useUserMessage } from "@/shared/api/use-user-message";
import { formatDateTime } from "@/shared/lib/format/datetime";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/atoms/shadcn/badge";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { type ChatDelivery, useChatDeliveries } from "../api/use-chat-channel";
import { TEMPLATE_TITLE_KEYS } from "../lib/chat-template";

const OUTCOME_CLASS: Record<ChatDelivery["outcome"], string> = {
  sent: "bg-positive-soft text-positive-deep",
  digest: "bg-positive-soft text-positive-deep",
  failed: "bg-error-soft text-error-deep",
  test: "bg-muted text-foreground",
  rate_limited_global: "bg-muted text-foreground",
  rate_limited_seller: "bg-muted text-foreground",
};

/** The latest messages the channel sent or held back, newest first. */
export function ChatDeliveryLog() {
  const t = useTranslations("admin.chat.log");
  const to = useTranslations("admin.chat.outcome");
  const tt = useTranslations("admin.chat.types");
  const tc = useTranslations("admin.chat");
  const userMessage = useUserMessage();
  const {
    data,
    error,
    isError,
    isPending,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useChatDeliveries();

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-error-deep">{userMessage(error)}</p>
        <Button variant="outline" onClick={() => void refetch()}>
          {tc("retry")}
        </Button>
      </div>
    );
  }
  if (isPending) {
    return <Skeleton className="h-48 w-full" />;
  }

  const rows = data.pages.flatMap((page) => page.items);
  if (rows.length === 0) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">{t("title")}</caption>
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="p-2 font-medium">{t("time")}</th>
              <th className="p-2 font-medium">{t("type")}</th>
              <th className="p-2 font-medium">{t("seller")}</th>
              <th className="p-2 font-medium">{t("outcome")}</th>
              <th className="p-2 font-medium">{t("content")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const titleKey = TEMPLATE_TITLE_KEYS[row.eventType];
              return (
                <tr key={row.id} className="border-b border-border align-top">
                  <td className="p-2 whitespace-nowrap tabular-nums">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="p-2">
                    {titleKey
                      ? tt(titleKey as Parameters<typeof tt>[0])
                      : row.eventType}
                  </td>
                  <td className="p-2">{row.sellerName}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-transparent",
                          OUTCOME_CLASS[row.outcome],
                        )}
                      >
                        {to(row.outcome)}
                      </Badge>
                      {row.digest && (
                        <span className="text-[13px] text-muted-foreground">
                          {row.digest === "pending"
                            ? t("digestPending")
                            : t("digestIncluded")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 whitespace-pre-wrap break-words">
                    {row.error ? (
                      <span className="text-error-deep">{row.error}</span>
                    ) : (
                      row.message
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasNextPage && (
        <div>
          <Button
            variant="outline"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {t("more")}
          </Button>
        </div>
      )}
    </div>
  );
}
