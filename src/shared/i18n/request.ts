import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, TIME_ZONE } from "./config";
import { MESSAGES } from "./messages";

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value);
  return { locale, messages: MESSAGES[locale], timeZone: TIME_ZONE };
});
