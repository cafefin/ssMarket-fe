"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toApiError } from "@/shared/api/api-error";
import { api, type CurrentUser } from "@/shared/api/client";
import { CURRENT_USER_QUERY_KEY } from "@/shared/api/use-current-user";
import type { Locale } from "@/shared/i18n/config";

/** Saves the person's language in `users.locale`. */
export function useUpdateLocale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locale: Locale): Promise<CurrentUser> => {
      const { data, error, response } = await api.PATCH("/users/me", {
        body: { locale },
      });
      if (!data) {
        throw toApiError(error, response);
      }
      return data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
    },
  });
}
