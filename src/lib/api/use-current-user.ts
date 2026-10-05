"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type CurrentUser } from "./client";

export const CURRENT_USER_QUERY_KEY = ["current-user"] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async (): Promise<CurrentUser> => {
      const { data, response } = await api.GET("/users/me");
      if (!data) {
        throw new Error(`Failed to load the current user (${response.status})`);
      }
      return data;
    },
  });
}
