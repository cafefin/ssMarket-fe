"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LISTINGS_QUERY_KEY } from "@/features/listings";
import { ORDERS_QUERY_KEY } from "@/features/orders";
import { toApiError } from "@/shared/api/api-error";
import { api } from "@/shared/api/client";
import type { components } from "@/shared/api/schema";

export type Cart = components["schemas"]["CartDto"];
export type CartGroup = components["schemas"]["CartGroupDto"];
export type CartLine = components["schemas"]["CartLineDto"];
export type CheckoutLine = components["schemas"]["CheckoutLineDto"];
export type CheckoutPreview = components["schemas"]["CheckoutPreviewDto"];
export type PlannedOrder = components["schemas"]["CheckoutPreviewOrderDto"];
export type CheckoutChoice = components["schemas"]["CheckoutOrderChoiceDto"];
export type CheckoutResult = components["schemas"]["CheckoutResultDto"];

export const CART_QUERY_KEY = ["cart"] as const;
export const CART_COUNT_QUERY_KEY = ["cart", "count"] as const;

export function useCart() {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: async (): Promise<Cart> => {
      const { data, error, response } = await api.GET("/cart");
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
  });
}

export function useCartCount() {
  return useQuery({
    queryKey: CART_COUNT_QUERY_KEY,
    queryFn: async (): Promise<number> => {
      const { data, error, response } = await api.GET("/cart/count");
      if (!data) {
        throw toApiError(error, response);
      }
      return data.count;
    },
  });
}

/** Writes the answer of a cart change into both cart queries. */
function useStoreCart() {
  const queryClient = useQueryClient();
  return (cart: Cart) => {
    queryClient.setQueryData(CART_QUERY_KEY, cart);
    queryClient.setQueryData(CART_COUNT_QUERY_KEY, cart.lineCount);
  };
}

/** Puts an option in the cart with this quantity, or changes it. */
export function useSetCartLine() {
  const store = useStoreCart();
  return useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: string;
      quantity: string;
    }): Promise<Cart> => {
      const { data, error, response } = await api.PUT("/cart/lines/{itemId}", {
        params: { path: { itemId } },
        body: { quantity },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: store,
  });
}

export function useRemoveCartLine() {
  const store = useStoreCart();
  return useMutation({
    mutationFn: async (itemId: string): Promise<Cart> => {
      const { data, error, response } = await api.DELETE(
        "/cart/lines/{itemId}",
        { params: { path: { itemId } } },
      );
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: store,
  });
}

export const checkoutPreviewQueryKey = (lines: CheckoutLine[]) =>
  ["checkout-preview", lines] as const;

/** The orders a checkout of these lines would create, priced by the server. */
export function useCheckoutPreview(lines: CheckoutLine[]) {
  return useQuery({
    queryKey: checkoutPreviewQueryKey(lines),
    enabled: lines.length > 0,
    queryFn: async (): Promise<CheckoutPreview> => {
      const { data, error, response } = await api.POST("/checkout/preview", {
        body: { lines },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      idempotencyKey,
      body,
    }: {
      idempotencyKey: string;
      body: components["schemas"]["CheckoutRequestDto"];
    }): Promise<CheckoutResult> => {
      const { data, error, response } = await api.POST("/checkout", {
        params: { header: { "Idempotency-Key": idempotencyKey } },
        body,
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY }),
      ]),
  });
}
