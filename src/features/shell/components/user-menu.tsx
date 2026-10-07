"use client";

import { useQueryClient } from "@tanstack/react-query";
import { TranslateIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/shared/ui/molecules/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/atoms/shadcn/dropdown-menu";
import { api, type CurrentUser } from "@/shared/api/client";
import { MESSAGES } from "@/shared/i18n/messages";
import { useSwitchLocale } from "../lib/use-switch-locale";

export function UserMenu({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("shell.menu");
  const { locale, switchTo, isPending } = useSwitchLocale();
  const other = locale === "vi" ? "en" : "vi";

  async function handleLogout(): Promise<void> {
    await api.POST("/auth/logout");
    // Drop cached data so the next person on this browser never sees it.
    queryClient.clear();
    router.replace("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("account", { name: user.name })}
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <UserAvatar
          name={user.name}
          avatarUrl={user.avatarUrl}
          tone="plain"
          decorative={false}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-[13px] text-muted-foreground">
            {user.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          {t("profile")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/orders")}>
          {t("myOrders")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/sell")}>
          {t("myListings")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/sell/orders")}>
          {t("receivedOrders")}
        </DropdownMenuItem>
        {user.role === "admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/admin/categories")}>
              {t("categories")}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        {/* From md up the switch sits in the header instead. */}
        <DropdownMenuItem
          className="md:hidden"
          disabled={isPending}
          onClick={() => void switchTo(other)}
        >
          <TranslateIcon aria-hidden="true" />
          {/* The other language, named in that language. */}
          <span lang={other}>{MESSAGES[other].shell.language.self}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleLogout()}>
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
