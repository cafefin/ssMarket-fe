"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toApiError } from "@/shared/api/api-error";
import {
  campaignQueryKey,
  campaignSummaryQueryKey,
  MY_CAMPAIGNS_QUERY_KEY,
} from "@/shared/api/campaign-keys";
import { api } from "@/shared/api/client";
import type { components } from "@/shared/api/schema";
import { LISTINGS_QUERY_KEY } from "@/features/listings";

export type Order = components["schemas"]["OrderDetailDto"];
export type OrderQr = components["schemas"]["OrderQrDto"];
export type PaymentMethod = components["schemas"]["PaymentMethod"];
export type PaymentStatus = components["schemas"]["PaymentStatus"];
export type FulfillmentStatus = components["schemas"]["FulfillmentStatus"];
export type EditOrderBody = components["schemas"]["EditOrderDto"];
export type SalesSummary = components["schemas"]["SalesSummaryDto"];
export type SummaryRow = components["schemas"]["SummaryRowDto"];
export type CampaignSummaryTable = components["schemas"]["CampaignSummaryTableDto"];
export type CampaignSummaryRow = components["schemas"]["CampaignSummaryRowDto"];
export type BulkAction = components["schemas"]["BulkOrdersDto"]["action"];
export type BulkResult = components["schemas"]["BulkResultDto"];

export const ORDERS_QUERY_KEY = ["orders"] as const;
export const SALES_QUERY_KEY = ["sales"] as const;
export const orderQueryKey = (id: string) => ["order", id] as const;

/**
 * What a write to an order of a round makes stale for the seller: the
 * round's summary table and the order count in the list of their rounds.
 */
function roundKeysOf(order: Order | undefined) {
  return order?.campaign
    ? [campaignSummaryQueryKey(order.campaign.id), MY_CAMPAIGNS_QUERY_KEY]
    : [];
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderQueryKey(id),
    queryFn: async (): Promise<Order> => {
      const { data, error, response } = await api.GET("/orders/{id}", {
        params: { path: { id } },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    // While the buyer waits for the seller to confirm, check now and then.
    refetchInterval: (query) => {
      const order = query.state.data;
      return order?.viewerRole === "buyer" &&
        order.paymentStatus === "reported" &&
        order.fulfillmentStatus !== "cancelled"
        ? 30_000
        : false;
    },
  });
}

export function useMyOrders() {
  return useInfiniteQuery({
    queryKey: ORDERS_QUERY_KEY,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error, response } = await api.GET("/orders", {
        params: { query: { cursor: pageParam ?? undefined } },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export interface SalesFilters {
  listingId: string | null;
  paymentStatus: PaymentStatus | null;
  fulfillmentStatus: FulfillmentStatus | null;
}

export function useSales(filters: SalesFilters) {
  return useInfiniteQuery({
    queryKey: [...SALES_QUERY_KEY, filters],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error, response } = await api.GET("/users/me/sales", {
        params: {
          query: {
            listingId: filters.listingId ?? undefined,
            paymentStatus: filters.paymentStatus ?? undefined,
            fulfillmentStatus: filters.fulfillmentStatus ?? undefined,
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

export type OrderAction =
  | "report-payment"
  | "confirm-payment"
  | "reject-payment"
  | "deliver"
  | "cancel";

const ACTION_PATHS = {
  "report-payment": "/orders/{id}/report-payment",
  "confirm-payment": "/orders/{id}/confirm-payment",
  "reject-payment": "/orders/{id}/reject-payment",
  deliver: "/orders/{id}/deliver",
} as const;

export function useOrderAction() {
  const queryClient = useQueryClient();
  // The round is read from the order as it was last seen: a refused action
  // has no answer to read it from.
  const refresh = (id: string) =>
    Promise.all(
      [
        orderQueryKey(id),
        ORDERS_QUERY_KEY,
        SALES_QUERY_KEY,
        LISTINGS_QUERY_KEY,
        ...roundKeysOf(queryClient.getQueryData<Order>(orderQueryKey(id))),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );

  return useMutation({
    mutationFn: async (input: {
      id: string;
      action: OrderAction;
      reason?: string;
    }): Promise<Order> => {
      const params = { path: { id: input.id } };
      const { data, error, response } =
        input.action === "cancel"
          ? await api.POST("/orders/{id}/cancel", {
              params,
              body: { reason: input.reason ?? null },
            })
          : await api.POST(ACTION_PATHS[input.action], { params });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: (order) => {
      queryClient.setQueryData(orderQueryKey(order.id), order);
      return refresh(order.id);
    },
    // The order changed under us (e.g. the other person acted first): show
    // its current state rather than stale buttons.
    onError: (_error, input) => refresh(input.id),
  });
}

export function useEditOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; body: EditOrderBody }): Promise<Order> => {
      const { data, error, response } = await api.PATCH("/orders/{id}", {
        params: { path: { id: input.id } },
        body: input.body,
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: (order) => {
      queryClient.setQueryData(orderQueryKey(order.id), order);
      // Only an order of a round can be edited; the round's page shows the
      // buyer's order and the seller's screens count it.
      return Promise.all(
        [
          ORDERS_QUERY_KEY,
          LISTINGS_QUERY_KEY,
          ...(order.campaign ? [campaignQueryKey(order.campaign.id)] : []),
          ...roundKeysOf(order),
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}

export const summaryQueryKey = (listingId: string) =>
  ["summary", listingId] as const;

/** Who ordered what on one of the seller's listings. */
export function useSummary(listingId: string) {
  return useQuery({
    queryKey: summaryQueryKey(listingId),
    queryFn: async (): Promise<SalesSummary> => {
      const { data, error, response } = await api.GET(
        "/listings/{listingId}/summary",
        { params: { path: { listingId } } },
      );
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
  });
}

export function useBulkOrders(listingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      action: BulkAction;
      orderIds: string[];
    }): Promise<BulkResult[]> => {
      const { data, error, response } = await api.POST(
        "/listings/{listingId}/orders/bulk",
        { params: { path: { listingId } }, body: input },
      );
      if (!data) {
        throw toApiError(error, response);
      }
      return data.results;
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: summaryQueryKey(listingId) }),
        queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEY }),
      ]),
  });
}

/** Who ordered what in one of the seller's pre-order rounds. */
export function useCampaignSummary(campaignId: string) {
  return useQuery({
    queryKey: campaignSummaryQueryKey(campaignId),
    queryFn: async (): Promise<CampaignSummaryTable> => {
      const { data, error, response } = await api.GET(
        "/campaigns/{campaignId}/summary",
        { params: { path: { campaignId } } },
      );
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
  });
}

export function useCampaignBulkOrders(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      action: BulkAction;
      orderIds: string[];
    }): Promise<BulkResult[]> => {
      const { data, error, response } = await api.POST(
        "/campaigns/{campaignId}/orders/bulk",
        { params: { path: { campaignId } }, body: input },
      );
      if (!data) {
        throw toApiError(error, response);
      }
      return data.results;
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: campaignSummaryQueryKey(campaignId),
        }),
        queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEY }),
      ]),
  });
}
