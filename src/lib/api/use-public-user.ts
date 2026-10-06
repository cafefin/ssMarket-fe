"use client";

import { useQuery } from "@tanstack/react-query";
import { toApiError } from "./api-error";
import { api } from "./client";
import type { components } from "./schema";

export type PublicUser = components["schemas"]["PublicUserDto"];

export function usePublicUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: async (): Promise<PublicUser> => {
      const { data, error, response } = await api.GET("/users/{id}", {
        params: { path: { id } },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
  });
}
