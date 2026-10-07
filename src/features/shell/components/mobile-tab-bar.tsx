"use client";

import { PlusIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { isActive, NAV_ITEMS, type NavItem, PROFILE_ITEM } from "../lib/nav-items";

const TAB =
  "flex min-h-13 flex-col items-center justify-end gap-0.5 rounded-md text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function Tab({ item, pathname }: { item: NavItem; pathname: string }) {
  const t = useTranslations("shell");
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        TAB,
        active ? "font-semibold text-primary" : "text-muted-foreground",
      )}
    >
      {/* The current section shows the filled icon. */}
      <Icon
        aria-hidden="true"
        weight={active ? "fill" : "regular"}
        className="size-6"
      />
      {t(`nav.${item.labelKey}`)}
    </Link>
  );
}

/** Bottom navigation for phones; from md up the header carries the links. */
export function MobileTabBar() {
  const pathname = usePathname();
  const t = useTranslations("shell");
  const [home, orders, selling] = NAV_ITEMS;

  return (
    <nav
      aria-label={t("mainNavigation")}
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 items-end border-t border-border bg-background px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] md:hidden"
    >
      <Tab item={home} pathname={pathname} />
      <Tab item={orders} pathname={pathname} />
      <Link href="/sell/new" className={cn(TAB, "text-primary-deep")}>
        <span className="-mt-5 flex size-11 items-center justify-center rounded-full border-[3px] border-background bg-primary text-primary-foreground">
          <PlusIcon aria-hidden="true" className="size-5" />
        </span>
        {t("sell")}
      </Link>
      <Tab item={selling} pathname={pathname} />
      <Tab item={PROFILE_ITEM} pathname={pathname} />
    </nav>
  );
}
