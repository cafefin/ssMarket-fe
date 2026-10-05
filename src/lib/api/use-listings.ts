"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { ListingFilters } from "@/lib/listings/filters";
import { toApiError } from "./api-error";
import { api } from "./client";
import type { components } from "./schema";

export type ListingSummary = components["schemas"]["ListingSummaryDto"];
export type ListingDetail = components["schemas"]["ListingDetailDto"];
export type ListingItem = components["schemas"]["ListingItemDto"];
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
            mode: filters.mode ?? undefined,
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
