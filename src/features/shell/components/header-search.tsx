"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Input } from "@/shared/ui/atoms/shadcn/input";

/**
 * The search box in the header. Submitting goes to the home page with `?q=`.
 * On the home page the category and mode filters already in the URL are kept.
 */
export function HeaderSearch({ className }: { className?: string }) {
  const router = useRouter();
  const t = useTranslations("shell");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("q") ?? "";

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    const params =
      pathname === "/" ? new URLSearchParams(searchParams) : new URLSearchParams();
    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    const query = params.toString();
    router.push(query ? `/?${query}` : "/");
  }

  return (
    <form role="search" onSubmit={onSubmit} className={className}>
      <div className="relative">
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          // Remount when the URL changes so the box reflects the active query.
          key={current}
          type="search"
          name="q"
          defaultValue={current}
          maxLength={100}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="h-11 rounded-full bg-surface pl-9"
        />
      </div>
    </form>
  );
}
