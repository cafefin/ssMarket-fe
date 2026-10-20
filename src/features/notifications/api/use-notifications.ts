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

export type NotificationPage = components["schemas"]["NotificationPageDto"];

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
export const UNREAD_COUNT_QUERY_KEY = ["notifications", "unread-count"] as const;
export const NOTIFICATION_LIST_QUERY_KEY = ["notifications", "list"] as const;
export const UNREAD_POLL_MS = 60_000;

/** The bell's badge. Polled, and refreshed when the tab gets focus again. */
export function useUnreadCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: async (): Promise<number> => {
      const { data, error, response } = await api.GET(
        "/notifications/unread-count",
      );
      if (!data) {
        throw toApiError(error, response);
      }
      return data.count;
    },
    refetchInterval: UNREAD_POLL_MS,
    refetchIntervalInBackground: false,
    // The app default turns focus refetching off and caches for a minute.
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

/** The list in the bell's panel; fetched only while the panel is open. */
export function useNotificationList(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: NOTIFICATION_LIST_QUERY_KEY,
    enabled,
    // The badge may count what a cached list lacks: refetch on every open.
    staleTime: 0,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<NotificationPage> => {
      const { data, error, response } = await api.GET("/notifications", {
        params: { query: { cursor: pageParam } },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error, response } = await api.POST("/notifications/{id}/read", {
        params: { path: { id } },
      });
      if (!response.ok) {
        throw toApiError(error, response);
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error, response } = await api.POST("/notifications/read-all");
      if (!response.ok) {
        throw toApiError(error, response);
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}
