"use client";

import Link from "next/link";
import type { Category } from "@/lib/api/use-categories";
import {
  type ListingFilters as Filters,
  listingsHref,
} from "@/lib/listings/filters";
import { cn } from "@/shared/lib/utils";

const MODES = [
  { value: "in_stock", label: "Có sẵn" },
  { value: "preorder", label: "Đặt trước" },
] as const;

const FOCUS = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function Choice({
  href,
  active,
  variant,
  children,
}: {
  href: string;
  active: boolean;
  variant: "chip" | "segment";
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
        "inline-flex shrink-0 items-center rounded-full text-sm font-medium whitespace-nowrap",
        FOCUS,
        variant === "segment"
          ? cn("h-8 px-3.5", active ? "bg-foreground text-background" : "text-foreground hover:bg-surface")
          : cn(
              "h-9 border px-3.5",
              active
                ? "border-primary-soft bg-primary-soft text-primary-deep"
                : "border-border bg-background text-foreground hover:bg-surface",
            ),
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Mode and category filters in one bar that stays under the header. Choosing
 * the active filter again, or the "all" choice, clears that filter.
 */
export function ListingFilters({
  filters,
  categories,
}: {
  filters: Filters;
  categories: Category[];
}) {
  return (
    // top-16 matches the header's fixed height (h-16).
    <div className="sticky top-16 z-10 -mx-4 border-b border-border bg-background px-4 sm:-mx-8 sm:px-8">
      <div className="flex items-center gap-2 overflow-x-auto px-1 py-2.5 [scrollbar-width:none]">
        <div
          role="group"
          aria-label="Hình thức bán"
          className="flex shrink-0 rounded-full border border-border p-0.5"
        >
          <Choice
            variant="segment"
            active={filters.mode === null}
            href={listingsHref({ ...filters, mode: null })}
          >
            Tất cả
          </Choice>
          {MODES.map((mode) => {
            const active = filters.mode === mode.value;
            return (
              <Choice
                key={mode.value}
                variant="segment"
                active={active}
                href={listingsHref({
                  ...filters,
                  mode: active ? null : mode.value,
                })}
              >
                {mode.label}
              </Choice>
            );
          })}
        </div>

        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />

        <div role="group" aria-label="Loại hàng" className="flex shrink-0 gap-2">
          <Choice
            variant="chip"
            active={filters.category === null}
            href={listingsHref({ ...filters, category: null })}
          >
            Mọi loại hàng
          </Choice>
          {categories.map((category) => {
            const active = filters.category === category.slug;
            return (
              <Choice
                key={category.slug}
                variant="chip"
                active={active}
                href={listingsHref({
                  ...filters,
                  category: active ? null : category.slug,
                })}
              >
                {category.name}
              </Choice>
            );
          })}
        </div>
      </div>
    </div>
  );
}
