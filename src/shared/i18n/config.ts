export const LOCALES = ["vi", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "vi";

/** The cookie next-intl reads by default; a copy of `users.locale`. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Everyone works in Vietnam; server and browser format in the same zone. */
export const TIME_ZONE = "Asia/Ho_Chi_Minh";

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** A supported locale, or the default for a missing or unknown value. */
export function resolveLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
