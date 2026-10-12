"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { toApiError } from "@/shared/api/api-error";
import { api } from "@/shared/api/client";
import type { components } from "@/shared/api/schema";

export type CampaignSummary = components["schemas"]["CampaignSummaryDto"];
export type CampaignDetail = components["schemas"]["CampaignDetailDto"];
export type CampaignItem = components["schemas"]["CampaignItemDto"];

export const CAMPAIGNS_QUERY_KEY = ["campaigns"] as const;
export const campaignQueryKey = (id: string) => ["campaign", id] as const;

export interface CampaignFilters {
  q: string;
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
}

/** Open rounds matching the filters, closing soonest first. */
export function useCampaigns(filters: CampaignFilters) {
  return useInfiniteQuery({
    queryKey: [...CAMPAIGNS_QUERY_KEY, filters],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error, response } = await api.GET("/campaigns", {
        params: {
          query: {
            q: filters.q || undefined,
            category: filters.category ?? undefined,
            minPrice: filters.minPrice ?? undefined,
            maxPrice: filters.maxPrice ?? undefined,
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

/** The rounds that close soonest (the server orders them). */
export function useClosingCampaigns(limit: number) {
  return useQuery({
    queryKey: [...CAMPAIGNS_QUERY_KEY, "closing", limit],
    queryFn: async (): Promise<CampaignSummary[]> => {
      const { data, error, response } = await api.GET("/campaigns", {
        params: { query: { limit } },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data.items;
    },
  });
}

/** One seller's open rounds, first page only. */
export function useSellerCampaigns(sellerId: string) {
  return useQuery({
    queryKey: [...CAMPAIGNS_QUERY_KEY, "seller", sellerId],
    queryFn: async (): Promise<CampaignSummary[]> => {
      const { data, error, response } = await api.GET("/campaigns", {
        params: { query: { sellerId } },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data.items;
    },
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: campaignQueryKey(id),
    queryFn: async (): Promise<CampaignDetail> => {
      const { data, error, response } = await api.GET("/campaigns/{id}", {
        params: { path: { id } },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
  });
}

/**
 * The id of the order the signed-in person has in a round, or null. Asked
 * afresh every time the round page opens: a checkout elsewhere changes it,
 * and the cart knows nothing of this query.
 */
export function useMyCampaignOrder(campaignId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...campaignQueryKey(campaignId), "my-order"],
    enabled,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<string | null> => {
      const { data, error, response } = await api.GET(
        "/campaigns/{campaignId}/my-order",
        { params: { path: { campaignId } } },
      );
      if (!data) {
        throw toApiError(error, response);
      }
      return data.orderId;
    },
  });
}
