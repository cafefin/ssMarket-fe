"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { CaretDownIcon, XIcon } from "@phosphor-icons/react/ssr";
import type { Category } from "../api/use-categories";
import {
  type ListingFilters as Filters,
  listingsHref,
  MODE_FILTERS,
  PRICE_RANGES,
} from "../lib/filters";
import { useFormat } from "@/shared/lib/format/use-format";
import { CONDITION_PERCENT, CONDITIONS } from "../lib/condition";
import { categoryName } from "../lib/category-name";
import { cn } from "@/shared/lib/utils";

const FOCUS = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const CHIP = "inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap";
const CHIP_ON = "border-primary-soft bg-primary-soft text-primary-deep";
const CHIP_OFF = "border-border bg-background text-foreground hover:bg-surface";

/** Closes the menu a link sits in, so the page shows the new results. */
function closeMenu(event: MouseEvent<HTMLElement>) {
  event.currentTarget.closest("details")?.removeAttribute("open");
}

/**
 * A filter with several choices, as a disclosure: a chip that opens a panel
 * of links under the whole bar (so it fits a 360px screen). Links, like the
 * other filters, keep the URL shareable. The chip shows the current choice,
 * and an ✕ next to it removes that filter.
 */
function Menu({
  label,
  active,
  clearHref,
  clearLabel,
  children,
}: {
  label: string;
  active: boolean;
  clearHref: string;
  clearLabel: string;
  children: ReactNode;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    // A click anywhere else closes the menu.
    function onPointerDown(event: PointerEvent) {
      const element = menu.current;
      if (element?.open && !element.contains(event.target as Node)) {
        element.open = false;
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="flex items-center gap-0.5">
      <details ref={menu} className="group/menu">
        <summary
          className={cn(
            CHIP,
            "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
            FOCUS,
            active ? CHIP_ON : CHIP_OFF,
          )}
        >
          {label}
          <CaretDownIcon
            aria-hidden="true"
            className="size-4 transition-transform group-open/menu:rotate-180"
          />
        </summary>
        <div className="absolute inset-x-0 top-full z-20 mx-1 mt-1 flex flex-wrap gap-2 rounded-lg border border-border bg-popover p-3 shadow-md sm:right-auto sm:max-w-md">
          {children}
        </div>
      </details>
      {active && (
        <Link
          href={clearHref}
          scroll={false}
          aria-label={clearLabel}
          className={cn(
            "flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground",
            FOCUS,
          )}
        >
          <XIcon aria-hidden="true" className="size-4" />
        </Link>
      )}
    </div>
  );
}

/** One choice inside a menu, drawn as a chip. */
function MenuChip({
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
      onClick={closeMenu}
      className={cn(CHIP, FOCUS, active ? CHIP_ON : CHIP_OFF)}
    >
      {children}
    </Link>
  );
}

/**
 * The filter bar under the header: how the goods are sold (in stock first,
 * the default), then category, price and condition as menus. Every choice
 * is a client-side link, so the page keeps its place and the URL can be
 * shared.
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
  const category = categories.find((c) => c.slug === filters.category);
  const categoryLabel = category
    ? categoryName(category, locale)
    : t("filters.category");
  const priceText = currentRange ? priceLabel(currentRange) : t("filters.price");
  const conditionText = filters.minCondition
    ? conditionLabel(filters.minCondition)
    : t("filters.condition");

  return (
    // top-16 matches the header's fixed height (h-16).
    <div className="sticky top-16 z-10 -mx-4 flex flex-col gap-2 border-b border-border bg-background px-4 py-2.5 sm:-mx-8 sm:px-8">
      <div
        role="group"
        aria-label={t("filters.modeGroup")}
        className="flex w-full rounded-full border border-border p-0.5 sm:w-fit"
      >
        {MODE_FILTERS.map((mode) => {
          const active = filters.mode === mode;
          return (
            <Link
              key={mode}
              href={listingsHref({ ...filters, mode })}
              scroll={false}
              // A link that behaves as a segment: the state is announced.
              role="button"
              aria-pressed={active}
              className={cn(
                "inline-flex h-8 flex-1 items-center justify-center rounded-full px-3.5 text-sm font-medium whitespace-nowrap sm:flex-none",
                FOCUS,
                active ? "bg-foreground text-background" : "text-foreground hover:bg-surface",
              )}
            >
              {t(`filters.modes.${mode}`)}
            </Link>
          );
        })}
      </div>

      <div className="relative flex flex-wrap items-center gap-x-1.5 gap-y-2">
        <Menu
          label={categoryLabel}
          active={category !== undefined}
          clearHref={listingsHref({ ...filters, category: null })}
          clearLabel={t("filters.clear", { name: categoryLabel })}
        >
          <MenuChip
            href={listingsHref({ ...filters, category: null })}
            active={filters.category === null}
          >
            {t("filters.allCategories")}
          </MenuChip>
          {categories.map((option) => (
            <MenuChip
              key={option.slug}
              href={listingsHref({ ...filters, category: option.slug })}
              active={filters.category === option.slug}
            >
              {categoryName(option, locale)}
            </MenuChip>
          ))}
        </Menu>
        <Menu
          label={priceText}
          active={!anyPrice}
          clearHref={listingsHref({ ...filters, minPrice: null, maxPrice: null })}
          clearLabel={t("filters.clear", { name: priceText })}
        >
          <MenuChip
            href={listingsHref({ ...filters, minPrice: null, maxPrice: null })}
            active={anyPrice}
          >
            {t("filters.anyPrice")}
          </MenuChip>
          {PRICE_RANGES.map((range) => (
            <MenuChip
              key={`${range.minPrice}-${range.maxPrice}`}
              href={listingsHref({ ...filters, ...range })}
              active={range === currentRange}
            >
              {priceLabel(range)}
            </MenuChip>
          ))}
        </Menu>
        <Menu
          label={conditionText}
          active={filters.minCondition !== null}
          clearHref={listingsHref({ ...filters, minCondition: null })}
          clearLabel={t("filters.clear", { name: conditionText })}
        >
          <MenuChip
            href={listingsHref({ ...filters, minCondition: null })}
            active={filters.minCondition === null}
          >
            {t("filters.anyCondition")}
          </MenuChip>
          {CONDITIONS.map((condition) => (
            <MenuChip
              key={condition}
              href={listingsHref({ ...filters, minCondition: condition })}
              active={filters.minCondition === condition}
            >
              {conditionLabel(condition)}
            </MenuChip>
          ))}
        </Menu>
      </div>
    </div>
  );
}
