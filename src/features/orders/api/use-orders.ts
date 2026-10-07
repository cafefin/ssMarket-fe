"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toApiError } from "@/shared/api/api-error";
import { api } from "@/shared/api/client";
import type { components } from "@/shared/api/schema";
import { LISTINGS_QUERY_KEY, listingQueryKey } from "@/features/listings";

export type Order = components["schemas"]["OrderDetailDto"];
export type OrderQr = components["schemas"]["OrderQrDto"];
export type PaymentMethod = components["schemas"]["PaymentMethod"];
export type PaymentStatus = components["schemas"]["PaymentStatus"];
export type FulfillmentStatus = components["schemas"]["FulfillmentStatus"];
export type PlaceOrderBody = components["schemas"]["PlaceOrderDto"];
export type EditOrderBody = components["schemas"]["EditOrderDto"];
export type SalesSummary = components["schemas"]["SalesSummaryDto"];
export type SummaryRow = components["schemas"]["SummaryRowDto"];
export type BulkAction = components["schemas"]["BulkOrdersDto"]["action"];
export type BulkResult = components["schemas"]["BulkResultDto"];

export const ORDERS_QUERY_KEY = ["orders"] as const;
export const SALES_QUERY_KEY = ["sales"] as const;
export const orderQueryKey = (id: string) => ["order", id] as const;

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

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      body: PlaceOrderBody;
      /** One UUID per order form, so a double click creates one order. */
      idempotencyKey: string;
    }): Promise<Order> => {
      const { data, error, response } = await api.POST("/orders", {
        body: input.body,
        params: { header: { "Idempotency-Key": input.idempotencyKey } },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: (order) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: listingQueryKey(order.listing.id),
        }),
      ]),
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
  const refresh = (id: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: orderQueryKey(id) }),
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY }),
    ]);

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
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: listingQueryKey(order.listing.id),
        }),
      ]);
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
