"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { isLocale } from "@/shared/i18n/config";
import { writeLocaleCookie } from "@/shared/i18n/locale-cookie";

/**
 * `users.locale` is the source of truth; the cookie is a copy the server
 * renders from. The first time the account loads, a cookie that disagrees
 * (a new device, a choice made elsewhere) is corrected once. Later changes go
 * through the language switch, which updates both itself.
 */
export function LocaleSync() {
  const { data: user } = useCurrentUser();
  const locale = useLocale();
  const router = useRouter();
  const checked = useRef(false);

  useEffect(() => {
    if (!user || checked.current) {
      return;
    }
    checked.current = true;
    if (isLocale(user.locale) && user.locale !== locale) {
      writeLocaleCookie(user.locale);
      router.refresh();
    }
  }, [user, locale, router]);

  return null;
}
