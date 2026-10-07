"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { Category } from "../api/use-categories";
import {
  type ListingFilters as Filters,
  listingsHref,
} from "../lib/filters";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";
import { useFormat } from "@/shared/lib/format/use-format";
import { CONDITION_PERCENT, CONDITIONS } from "../lib/condition";
import { categoryName } from "../lib/category-name";
import { PRICE_RANGES } from "../lib/filters";
import { cn } from "@/shared/lib/utils";

const MODES = ["in_stock", "preorder"] as const;

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
 * A filter with several choices, as a disclosure: a chip that opens a list
 * of links. Links, like the other filters, so the URL stays shareable.
 */
function Menu({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group/menu relative">
      <summary
        className={cn(
          "inline-flex h-9 cursor-pointer list-none items-center gap-1 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap [&::-webkit-details-marker]:hidden",
          FOCUS,
          active
            ? "border-primary-soft bg-primary-soft text-primary-deep"
            : "border-border bg-background text-foreground hover:bg-surface",
        )}
      >
        {label}
        <CaretDownIcon
          aria-hidden="true"
          className="size-4 transition-transform group-open/menu:rotate-180"
        />
      </summary>
      <div className="absolute left-0 z-20 mt-1 flex min-w-56 flex-col gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-md">
        {children}
      </div>
    </details>
  );
}

function MenuLink({
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
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-md px-3 py-2 text-sm",
        FOCUS,
        active ? "bg-primary-soft font-medium text-primary-deep" : "hover:bg-surface",
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
  const t = useTranslations("listings");
  const locale = useLocale();
  const format = useFormat();
  const priceLabel = (range: { minPrice: number | null; maxPrice: number | null }) =>
    range.minPrice === null
      ? t("filters.under", { max: format.money(range.maxPrice ?? 0) })
      : range.maxPrice === null
        ? t("filters.over", { min: format.money(range.minPrice) })
        : t("filters.between", {
            min: format.money(range.minPrice),
            max: format.money(range.maxPrice),
          });
  const anyPrice = filters.minPrice === null && filters.maxPrice === null;
  const currentRange = PRICE_RANGES.find(
    (range) =>
      range.minPrice === filters.minPrice && range.maxPrice === filters.maxPrice,
  );
  const conditionLabel = (condition: (typeof CONDITIONS)[number]) =>
    t("filters.atLeast", {
      percent: CONDITION_PERCENT[condition],
      level: t(`condition.${condition}`),
    });
  return (
    // top-16 matches the header's fixed height (h-16).
    <div className="sticky top-16 z-10 -mx-4 border-b border-border bg-background px-4 sm:-mx-8 sm:px-8">
      <div className="flex items-center gap-2 overflow-x-auto px-1 py-2.5 [scrollbar-width:none]">
        <div
          role="group"
          aria-label={t("filters.modeGroup")}
          className="flex shrink-0 rounded-full border border-border p-0.5"
        >
          <Choice
            variant="segment"
            active={filters.mode === null}
            href={listingsHref({ ...filters, mode: null })}
          >
            {t("filters.allModes")}
          </Choice>
          {MODES.map((mode) => {
            const active = filters.mode === mode;
            return (
              <Choice
                key={mode}
                variant="segment"
                active={active}
                href={listingsHref({
                  ...filters,
                  mode: active ? null : mode,
                })}
              >
                {t(`mode.${mode}`)}
              </Choice>
            );
          })}
        </div>

        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />

        <div role="group" aria-label={t("filters.categoryGroup")} className="flex shrink-0 gap-2">
          <Choice
            variant="chip"
            active={filters.category === null}
            href={listingsHref({ ...filters, category: null })}
          >
            {t("filters.allCategories")}
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
                {categoryName(category, locale)}
              </Choice>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 px-1 pb-2.5">
        <Menu
          label={
            anyPrice
              ? t("filters.price")
              : currentRange
                ? priceLabel(currentRange)
                : t("filters.price")
          }
          active={!anyPrice}
        >
          <MenuLink
            href={listingsHref({ ...filters, minPrice: null, maxPrice: null })}
            active={anyPrice}
          >
            {t("filters.anyPrice")}
          </MenuLink>
          {PRICE_RANGES.map((range) => (
            <MenuLink
              key={`${range.minPrice}-${range.maxPrice}`}
              href={listingsHref({ ...filters, ...range })}
              active={range === currentRange}
            >
              {priceLabel(range)}
            </MenuLink>
          ))}
        </Menu>
        <Menu
          label={
            filters.minCondition
              ? conditionLabel(filters.minCondition)
              : t("filters.condition")
          }
          active={filters.minCondition !== null}
        >
          <MenuLink
            href={listingsHref({ ...filters, minCondition: null })}
            active={filters.minCondition === null}
          >
            {t("filters.anyCondition")}
          </MenuLink>
          {CONDITIONS.map((condition) => (
            <MenuLink
              key={condition}
              href={listingsHref({ ...filters, minCondition: condition })}
              active={filters.minCondition === condition}
            >
              {conditionLabel(condition)}
            </MenuLink>
          ))}
        </Menu>
      </div>
    </div>
  );
}
