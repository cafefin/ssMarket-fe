import type { Locale } from "@/shared/i18n/config";

/** The name of a category in the language of the page. */
export function categoryName(
  category: { name: string; nameEn: string },
  locale: Locale,
): string {
  return locale === "en" ? category.nameEn : category.name;
}
