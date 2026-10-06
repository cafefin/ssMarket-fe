"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toApiError } from "./api-error";
import { api } from "./client";
import type { components } from "./schema";
import {
  type ListingDetail,
  LISTINGS_QUERY_KEY,
  listingQueryKey,
} from "./use-listings";

export type ListingStatus = components["schemas"]["ListingStatus"];

export const MY_LISTINGS_QUERY_KEY = ["my-listings"] as const;

export function useMyListings(status: ListingStatus) {
  return useQuery({
    queryKey: [...MY_LISTINGS_QUERY_KEY, status],
    queryFn: async (): Promise<ListingDetail[]> => {
      const { data, error, response } = await api.GET("/users/me/listings", {
        params: { query: { status } },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
  });
}

function useListingAction(action: "publish" | "close") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<ListingDetail> => {
      const { data, error, response } = await api.POST(
        action === "publish" ? "/listings/{id}/publish" : "/listings/{id}/close",
        { params: { path: { id } } },
      );
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: (listing) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: MY_LISTINGS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: listingQueryKey(listing.id) }),
      ]),
  });
}

export const usePublishListing = () => useListingAction("publish");
export const useCloseListing = () => useListingAction("close");

/** Copies a finished pre-order round into a new draft and returns it. */
export function useReopenListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<ListingDetail> => {
      const { data, error, response } = await api.POST("/listings/{id}/reopen", {
        params: { path: { id } },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: MY_LISTINGS_QUERY_KEY }),
  });
}
