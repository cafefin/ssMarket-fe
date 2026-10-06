"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { LogoMark } from "@/components/brand/logo-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { buttonVariants } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/api/use-current-user";
import { cn } from "@/lib/utils";
import { HeaderSearch } from "./header-search";
import { isActive, NAV_ITEMS } from "./nav-items";
import { UserMenu } from "./user-menu";

export function AppHeader() {
  const { data: user } = useCurrentUser();
  const pathname = usePathname();

  return (
    // h-16 is relied on by the sticky filter bar (top-16).
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-8 md:gap-6">
        <Link
          href="/"
          aria-label="ssMarket"
          className="flex shrink-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <LogoMark />
          <Wordmark className="hidden text-[26px] leading-none md:inline" />
        </Link>

        {/* Phones use the tab bar at the bottom instead. */}
        <nav
          aria-label="Điều hướng chính"
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
                {item.label}
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
            aria-label="Đăng bán"
            className={buttonVariants({
              size: "icon-lg",
              className: "hidden size-11 md:inline-flex",
            })}
          >
            <PlusIcon aria-hidden="true" className="size-5" />
          </Link>
          {user && <UserMenu user={user} />}
        </div>
      </div>
    </header>
  );
}
