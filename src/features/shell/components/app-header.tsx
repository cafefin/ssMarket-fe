"use client";

import { PlusIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { LogoMark } from "@/shared/ui/atoms/logo-mark";
import { Wordmark } from "@/shared/ui/atoms/wordmark";
import { buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { cn } from "@/shared/lib/utils";
import { HeaderSearch } from "./header-search";
import { LocaleSwitch } from "./locale-switch";
import { LocaleSync } from "./locale-sync";
import { isActive, NAV_ITEMS } from "../lib/nav-items";
import { UserMenu } from "./user-menu";

export function AppHeader({ actions }: { actions?: ReactNode } = {}) {
  const { data: user } = useCurrentUser();
  const pathname = usePathname();
  const t = useTranslations("shell");

  return (
    // h-16 is relied on by the sticky filter bar (top-16).
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-8 md:gap-4 lg:gap-6">
        <Link
          href="/"
          aria-label="ssMarket"
          className="flex shrink-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <LogoMark />
          <Wordmark className="hidden text-[26px] leading-none lg:inline" />
        </Link>

        {/* Phones use the tab bar at the bottom instead. */}
        <nav
          aria-label={t("mainNavigation")}
          className="hidden items-center gap-1 md:flex"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center rounded-full px-3.5 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "bg-primary-soft text-primary-deep"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
              >
                {t(`nav.${item.labelKey}`)}
              </Link>
            );
          })}
        </nav>

        {/* useSearchParams needs a Suspense boundary on prerendered pages. */}
        <Suspense>
          <HeaderSearch className="min-w-0 flex-1 md:ml-auto md:max-w-md" />
        </Suspense>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/sell/new"
            aria-label={t("sell")}
            className={buttonVariants({
              size: "icon-lg",
              className: "size-11 max-md:hidden",
            })}
          >
            <PlusIcon aria-hidden="true" className="size-5" />
          </Link>
          {/* Phones switch from the account menu. */}
          {/* Joined in app/, e.g. the cart, which shell may not import. */}
          {actions}
          <LocaleSwitch className="max-md:hidden" />
          {user && <UserMenu user={user} />}
          <LocaleSync />
        </div>
      </div>
    </header>
  );
}
