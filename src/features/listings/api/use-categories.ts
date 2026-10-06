"use client";

import { useQuery } from "@tanstack/react-query";
import { toApiError } from "@/shared/api/api-error";
import { api } from "@/shared/api/client";
import type { components } from "@/shared/api/schema";

export type Category = components["schemas"]["CategoryResponseDto"];

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    // Reference data that only changes with a backend release.
    staleTime: Infinity,
    queryFn: async (): Promise<Category[]> => {
      const { data, error, response } = await api.GET("/categories");
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
  });
}
