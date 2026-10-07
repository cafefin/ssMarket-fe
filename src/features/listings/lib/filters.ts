import { isCondition, type ListingCondition } from "./condition";

export type ListingModeFilter = "in_stock" | "preorder";

export interface ListingFilters {
  q: string;
  category: string | null;
  mode: ListingModeFilter | null;
  /** Bounds on the cheapest option's unit price, integer VND. */
  minPrice: number | null;
  maxPrice: number | null;
  /** Second-hand goods at least this good. */
  minCondition: ListingCondition | null;
}

export const NO_FILTERS: ListingFilters = {
  q: "",
  category: null,
  mode: null,
  minPrice: null,
  maxPrice: null,
  minCondition: null,
};

/** The price ranges offered in the filter bar. */
export const PRICE_RANGES: ReadonlyArray<{
  minPrice: number | null;
  maxPrice: number | null;
}> = [
  { minPrice: null, maxPrice: 50_000 },
  { minPrice: 50_000, maxPrice: 200_000 },
  { minPrice: 200_000, maxPrice: 1_000_000 },
  { minPrice: 1_000_000, maxPrice: null },
];

const MODES: readonly string[] = ["in_stock", "preorder"];

function price(value: string | null): number | null {
  return value !== null && /^\d{1,10}$/.test(value) ? Number(value) : null;
}

/** Reads the browse filters from a URL query string, dropping anything invalid. */
export function parseListingFilters(params: URLSearchParams): ListingFilters {
  const mode = params.get("mode");
  const condition = params.get("minCondition");
  let minPrice = price(params.get("minPrice"));
  let maxPrice = price(params.get("maxPrice"));
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    // A range that ends before it starts would be refused by the API.
    minPrice = null;
    maxPrice = null;
  }
  return {
    q: (params.get("q") ?? "").trim(),
    category: params.get("category")?.trim() || null,
    mode: mode && MODES.includes(mode) ? (mode as ListingModeFilter) : null,
    minPrice,
    maxPrice,
    minCondition: isCondition(condition) ? condition : null,
  };
}

/** The canonical query string for a set of filters: fixed order, no empties. */
export function toSearchParams(filters: ListingFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.mode) {
    params.set("mode", filters.mode);
  }
  if (filters.minPrice !== null) {
    params.set("minPrice", String(filters.minPrice));
  }
  if (filters.maxPrice !== null) {
    params.set("maxPrice", String(filters.maxPrice));
  }
  if (filters.minCondition) {
    params.set("minCondition", filters.minCondition);
  }
  return params;
}

export function listingsHref(filters: ListingFilters): string {
  const query = toSearchParams(filters).toString();
  return query ? `/?${query}` : "/";
}
