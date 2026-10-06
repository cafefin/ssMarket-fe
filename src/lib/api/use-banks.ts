"use client";

import { useQuery } from "@tanstack/react-query";
import { toApiError } from "@/shared/api/api-error";
import { api } from "@/shared/api/client";
import type { components } from "@/shared/api/schema";

export type Bank = components["schemas"]["BankResponseDto"];

export function useBanks() {
  return useQuery({
    queryKey: ["banks"],
    // The bank directory changes a few times a year at most.
    staleTime: Infinity,
    queryFn: async (): Promise<Bank[]> => {
      const { data, error, response } = await api.GET("/banks");
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
  });
}
