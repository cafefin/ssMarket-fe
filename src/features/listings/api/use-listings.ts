"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { apiMode, type ListingFilters } from "../lib/filters";
import { toApiError } from "@/shared/api/api-error";
import { api } from "@/shared/api/client";
import type { components } from "@/shared/api/schema";

export type ListingSummary = components["schemas"]["ListingSummaryDto"];
export type ListingDetail = components["schemas"]["ListingDetailDto"];
export type Combo = components["schemas"]["ComboDto"];
export type ListingMode = components["schemas"]["ListingMode"];

export const LISTINGS_QUERY_KEY = ["listings"] as const;

export function useListings(filters: ListingFilters) {
  return useInfiniteQuery({
    queryKey: [...LISTINGS_QUERY_KEY, filters],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error, response } = await api.GET("/listings", {
        params: {
          query: {
            q: filters.q || undefined,
            category: filters.category ?? undefined,
            mode: apiMode(filters),
            minPrice: filters.minPrice ?? undefined,
            maxPrice: filters.maxPrice ?? undefined,
            // Pre-order products have no condition; the API would list none.
            minCondition:
              filters.mode === "in_stock"
                ? (filters.minCondition ?? undefined)
                : undefined,
            cursor: pageParam ?? undefined,
          },
        },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // Changing a filter keeps the current cards on screen until the new ones
    // arrive, so the page never flashes back to skeletons.
    placeholderData: keepPreviousData,
  });
}

export const listingQueryKey = (id: string) => ["listing", id] as const;

export function useListing(id: string) {
  return useQuery({
    queryKey: listingQueryKey(id),
    queryFn: async (): Promise<ListingDetail> => {
      const { data, error, response } = await api.GET("/listings/{id}", {
        params: { path: { id } },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
  });
}

/** One seller's goods in stock (the API's default mode), newest first. */
export function useSellerListings(sellerId: string) {
  return useInfiniteQuery({
    queryKey: [...LISTINGS_QUERY_KEY, "seller", sellerId],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error, response } = await api.GET("/listings", {
        params: {
          query: { seller: sellerId, cursor: pageParam ?? undefined },
        },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
