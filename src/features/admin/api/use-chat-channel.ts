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

export type ChatChannel = components["schemas"]["ChatChannelDto"];
export type ChatTemplate = components["schemas"]["ChatTemplateDto"];
export type ChatDelivery = components["schemas"]["ChatDeliveryDto"];
export type ChatSettingsUpdate = components["schemas"]["UpdateChatSettingsDto"];
export type ChatDeliveryPage = components["schemas"]["ChatDeliveryPageDto"];

export const CHAT_CHANNEL_QUERY_KEY = ["admin-chat-channel"] as const;
export const CHAT_DELIVERIES_QUERY_KEY = [
  "admin-chat-channel",
  "deliveries",
] as const;

export function useChatChannel(enabled = true) {
  return useQuery({
    queryKey: CHAT_CHANNEL_QUERY_KEY,
    enabled,
    queryFn: async (): Promise<ChatChannel> => {
      const { data, error, response } = await api.GET("/admin/chat-channel");
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
  });
}

export function useUpdateChatSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ChatSettingsUpdate): Promise<ChatChannel> => {
      const { data, error, response } = await api.PUT("/admin/chat-channel", {
        body,
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: (saved) => {
      // Show the saved state at once; the refetch then confirms it.
      queryClient.setQueryData(CHAT_CHANNEL_QUERY_KEY, saved);
      return queryClient.invalidateQueries({ queryKey: CHAT_CHANNEL_QUERY_KEY });
    },
  });
}

export function useUpdateChatTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventType,
      enabled,
      template,
    }: {
      eventType: string;
      enabled: boolean;
      template: string;
    }): Promise<ChatTemplate> => {
      const { data, error, response } = await api.PUT(
        "/admin/chat-channel/templates/{eventType}",
        { params: { path: { eventType } }, body: { enabled, template } },
      );
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CHAT_CHANNEL_QUERY_KEY }),
  });
}

/** The template rendered with sample data. The caller debounces `template`. */
export function useChatPreview(
  eventType: string,
  template: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...CHAT_CHANNEL_QUERY_KEY, "preview", eventType, template],
    enabled,
    retry: false,
    queryFn: async (): Promise<string> => {
      const { data, error, response } = await api.POST(
        "/admin/chat-channel/templates/{eventType}/preview",
        { params: { path: { eventType } }, body: { template } },
      );
      if (!data) {
        throw toApiError(error, response);
      }
      return data.message;
    },
  });
}

/** Posts a test message to the space; resolves to the text that was sent. */
export function useSendChatTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventType,
      template,
    }: {
      eventType: string;
      template: string;
    }): Promise<string> => {
      const { data, error, response } = await api.POST(
        "/admin/chat-channel/templates/{eventType}/test",
        { params: { path: { eventType } }, body: { template } },
      );
      if (!data) {
        throw toApiError(error, response);
      }
      return data.message;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CHAT_DELIVERIES_QUERY_KEY }),
  });
}

export function useChatDeliveries(enabled = true) {
  return useInfiniteQuery({
    queryKey: CHAT_DELIVERIES_QUERY_KEY,
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<ChatDeliveryPage> => {
      const { data, error, response } = await api.GET(
        "/admin/chat-channel/deliveries",
        { params: { query: { cursor: pageParam } } },
      );
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
