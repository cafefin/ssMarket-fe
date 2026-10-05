"use client";

import { useQuery } from "@tanstack/react-query";
import { toApiError } from "./api-error";
import { api } from "./client";
import type { components } from "./schema";

export type Category = components["schemas"]["CategoryResponseDto"];

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
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
