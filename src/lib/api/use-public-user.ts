"use client";

import { useQuery } from "@tanstack/react-query";
import { toApiError } from "./api-error";
import { api } from "./client";
import type { components } from "./schema";

export type PublicUser = components["schemas"]["PublicUserDto"];

export const publicUserQueryKey = (id: string) => ["user", id] as const;

export function usePublicUser(id: string) {
  return useQuery({
    queryKey: publicUserQueryKey(id),
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
