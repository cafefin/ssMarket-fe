"use client";

import { useQuery } from "@tanstack/react-query";
import { toApiError } from "./api-error";
import { api } from "./client";
import type { components } from "./schema";

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
