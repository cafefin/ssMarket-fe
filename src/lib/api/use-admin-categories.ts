"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toApiError } from "./api-error";
import { api } from "./client";
import type { components } from "./schema";
import { CATEGORIES_QUERY_KEY } from "./use-categories";
import { LISTINGS_QUERY_KEY } from "./use-listings";

export type AdminCategory = components["schemas"]["AdminCategoryDto"];
export type CategoryCreate = components["schemas"]["CreateCategoryDto"];
export type CategoryUpdate = components["schemas"]["UpdateCategoryDto"];

export const ADMIN_CATEGORIES_QUERY_KEY = ["admin-categories"] as const;

export function useAdminCategories(enabled = true) {
  return useQuery({
    queryKey: ADMIN_CATEGORIES_QUERY_KEY,
    enabled,
    queryFn: async (): Promise<AdminCategory[]> => {
      const { data, error, response } = await api.GET("/admin/categories");
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
  });
}

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY }),
    ]);
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: async (body: CategoryCreate): Promise<AdminCategory> => {
      const { data, error, response } = await api.POST("/admin/categories", {
        body,
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: number;
      body: CategoryUpdate;
    }): Promise<AdminCategory> => {
      const { data, error, response } = await api.PATCH(
        "/admin/categories/{id}",
        { params: { path: { id } }, body },
      );
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: invalidate,
  });
}
