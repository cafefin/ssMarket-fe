"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { useUserMessage } from "@/shared/api/use-user-message";
import type { Locale } from "@/shared/i18n/config";
import { writeLocaleCookie } from "@/shared/i18n/locale-cookie";
import { useUpdateLocale } from "../api/use-update-locale";

/**
 * Changes the language: saved on the account first, so it follows the person
 * to other devices, then mirrored in the cookie the server renders from.
 * `router.refresh()` re-renders with the new messages and keeps client state,
 * such as a half-filled form.
 */
export function useSwitchLocale() {
  const locale = useLocale();
  const router = useRouter();
  const update = useUpdateLocale();
  const userMessage = useUserMessage();

  async function switchTo(next: Locale): Promise<void> {
    if (next === locale || update.isPending) {
      return;
    }
    try {
      await update.mutateAsync(next);
      writeLocaleCookie(next);
      router.refresh();
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  return { locale, switchTo, isPending: update.isPending };
}
