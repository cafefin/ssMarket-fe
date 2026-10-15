"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LISTINGS_QUERY_KEY } from "@/features/listings";
import { toApiError } from "@/shared/api/api-error";
import {
  CAMPAIGNS_QUERY_KEY,
  campaignQueryKey,
  campaignSummaryQueryKey,
  MY_CAMPAIGNS_QUERY_KEY,
} from "@/shared/api/campaign-keys";
import { api } from "@/shared/api/client";
import type { components } from "@/shared/api/schema";

export type CampaignDetail = components["schemas"]["CampaignDetailDto"];
export type CampaignItem = components["schemas"]["CampaignItemDto"];
export type CampaignMine = components["schemas"]["CampaignMineDto"];

export { MY_CAMPAIGNS_QUERY_KEY };

/**
 * Everything that shows a round or its products, after `id` changed: the
 * lists, the round's page, the seller's summary (a column per product) and
 * the product cards.
 */
export function campaignKeysToInvalidate(id: string) {
  return [
    MY_CAMPAIGNS_QUERY_KEY,
    CAMPAIGNS_QUERY_KEY,
    campaignQueryKey(id),
    campaignSummaryQueryKey(id),
    LISTINGS_QUERY_KEY,
  ] as const;
}

/** All of the seller's rounds, newest first: drafts, open and closed. */
export function useMyCampaigns() {
  return useQuery({
    queryKey: MY_CAMPAIGNS_QUERY_KEY,
    queryFn: async (): Promise<CampaignMine[]> => {
      const { data, error, response } = await api.GET("/campaigns/mine");
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
  });
}

/** One round with all of its products, for the seller's edit form. */
export function useMyCampaign(id: string) {
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

function useInvalidateCampaign() {
  const queryClient = useQueryClient();
  return (id: string) =>
    Promise.all(
      campaignKeysToInvalidate(id).map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
}

function useCampaignAction(action: "publish" | "close" | "reopen") {
  const invalidate = useInvalidateCampaign();
  const path = (
    {
      publish: "/campaigns/{id}/publish",
      close: "/campaigns/{id}/close",
      reopen: "/campaigns/{id}/reopen",
    } as const
  )[action];

  return useMutation({
    mutationFn: async (id: string): Promise<CampaignDetail> => {
      const { data, error, response } = await api.POST(path, {
        params: { path: { id } },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    // Reopening answers with the new draft; the round acted on is `id`.
    onSuccess: (_campaign, id) => invalidate(id),
  });
}

export const usePublishCampaign = () => useCampaignAction("publish");
export const useCloseCampaign = () => useCampaignAction("close");
/** Copies a finished round into a new draft, which the mutation answers with. */
export const useReopenCampaign = () => useCampaignAction("reopen");

/** Deletes a draft round. */
export function useDeleteCampaign() {
  const invalidate = useInvalidateCampaign();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error, response } = await api.DELETE("/campaigns/{id}", {
        params: { path: { id } },
      });
      if (!response.ok) {
        throw toApiError(error, response);
      }
    },
    onSuccess: (_nothing, id) => invalidate(id),
  });
}
