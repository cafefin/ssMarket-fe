"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toApiError } from "./api-error";
import { api, type CurrentUser } from "./client";
import type { components } from "./schema";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user";
import { publicUserQueryKey } from "./use-public-user";

export type ProfileUpdate = components["schemas"]["UpdateProfileDto"];

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ProfileUpdate): Promise<CurrentUser> => {
      const { data, error, response } = await api.PATCH("/users/me", { body });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
      // The seller's own public page shows the same data.
      void queryClient.invalidateQueries({
        queryKey: publicUserQueryKey(user.id),
      });
    },
  });
}
