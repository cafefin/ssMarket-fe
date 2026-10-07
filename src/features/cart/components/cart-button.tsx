"use client";

import { ShoppingCartSimpleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";
import { useCartCount } from "../api/use-cart";

/** The cart in the header, with how many options it holds. */
export function CartButton({ className }: { className?: string }) {
  const t = useTranslations("cart");
  const { data: count = 0 } = useCartCount();
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? t("buttonCount", { count }) : t("button")}
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <ShoppingCartSimpleIcon aria-hidden="true" className="size-6" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
