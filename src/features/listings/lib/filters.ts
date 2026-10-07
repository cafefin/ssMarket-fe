export type ListingModeFilter = "in_stock" | "preorder";

export interface ListingFilters {
  q: string;
  category: string | null;
  mode: ListingModeFilter | null;
}

const MODES: readonly string[] = ["in_stock", "preorder"];

/** Reads the browse filters from a URL query string, dropping anything invalid. */
export function parseListingFilters(params: URLSearchParams): ListingFilters {
  const mode = params.get("mode");
  return {
    q: (params.get("q") ?? "").trim(),
    category: params.get("category")?.trim() || null,
    mode: mode && MODES.includes(mode) ? (mode as ListingModeFilter) : null,
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
  return params;
}

export function listingsHref(filters: ListingFilters): string {
  const query = toSearchParams(filters).toString();
  return query ? `/?${query}` : "/";
}
