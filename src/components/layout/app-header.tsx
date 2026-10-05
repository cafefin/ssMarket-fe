"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { buttonVariants } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/api/use-current-user";
import { HeaderSearch } from "./header-search";
import { UserMenu } from "./user-menu";

export function AppHeader() {
  const { data: user } = useCurrentUser();

  return (
    <header className="sticky top-0 z-10 border-b border-hairline-soft bg-background">
      {/* On phones the search box wraps onto its own row below the wordmark. */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:flex-nowrap sm:px-8">
        <Link href="/" className="rounded-sm">
          <Wordmark className="text-lg" />
        </Link>

        {/* useSearchParams needs a Suspense boundary on prerendered pages. */}
        <Suspense>
          <HeaderSearch className="order-last w-full sm:order-none sm:max-w-md sm:flex-1" />
        </Suspense>

        <div className="ml-auto flex items-center gap-3">
          <Link href="/sell/new" className={buttonVariants({ size: "sm" })}>
            Đăng bán
          </Link>
          {user && <UserMenu user={user} />}
        </div>
      </div>
    </header>
  );
}
