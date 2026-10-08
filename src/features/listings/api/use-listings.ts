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
            minCondition: filters.minCondition ?? undefined,
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

/** Open pre-orders, closing soonest first, ordered by the server. */
export function useClosingSoon(limit: number) {
  return useQuery({
    queryKey: [...LISTINGS_QUERY_KEY, "closing-soon", limit],
    queryFn: async (): Promise<ListingSummary[]> => {
      const { data, error, response } = await api.GET("/listings", {
        params: { query: { sort: "deadline", limit } },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data.items;
    },
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

/** One seller's open listings, newest first. */
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
