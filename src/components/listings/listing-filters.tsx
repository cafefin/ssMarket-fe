"use client";

import Link from "next/link";
import type { Category } from "@/lib/api/use-categories";
import {
  type ListingFilters as Filters,
  listingsHref,
} from "@/lib/listings/filters";
import { cn } from "@/lib/utils";

const MODES = [
  { value: "in_stock", label: "Có sẵn" },
  { value: "preorder", label: "Đặt trước" },
] as const;

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      // A link that behaves as a toggle: the state is announced, and the URL
      // stays shareable.
      role="button"
      aria-pressed={active}
      scroll={false}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:min-h-11",
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

/** Category and mode chips. Clicking the active chip clears that filter. */
export function ListingFilters({
  filters,
  categories,
}: {
  filters: Filters;
  categories: Category[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Loại hàng"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {categories.map((category) => {
          const active = filters.category === category.slug;
          return (
            <Chip
              key={category.slug}
              active={active}
              href={listingsHref({
                ...filters,
                category: active ? null : category.slug,
              })}
            >
              {category.name}
            </Chip>
          );
        })}
      </div>
      <div role="group" aria-label="Hình thức bán" className="flex gap-2">
        {MODES.map((mode) => {
          const active = filters.mode === mode.value;
          return (
            <Chip
              key={mode.value}
              active={active}
              href={listingsHref({
                ...filters,
                mode: active ? null : mode.value,
              })}
            >
              {mode.label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
