"use client";

import { BellIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/atoms/shadcn/popover";
import { useUnreadCount } from "../api/use-notifications";
import { NotificationList } from "./notification-list";

/** The bell in the header: unread badge, and the list in a popover. */
export function NotificationBell({ className }: { className?: string }) {
  const t = useTranslations("notifications");
  const { data: count = 0 } = useUnreadCount();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={count > 0 ? t("bellUnread", { count }) : t("bell")}
        className={cn(
          "relative flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      >
        <BellIcon aria-hidden="true" className="size-6" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground tabular-nums"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label={t("title")}
        className="max-h-[70vh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto"
      >
        {open && <NotificationList onNavigate={() => setOpen(false)} />}
      </PopoverContent>
    </Popover>
  );
}
