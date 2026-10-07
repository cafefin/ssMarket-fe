import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { DEFAULT_LOCALE, TIME_ZONE, type Locale } from "./config";
import { MESSAGES } from "./messages";

export function intlWrapper(locale: Locale = DEFAULT_LOCALE) {
  return function IntlWrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider
        locale={locale}
        messages={MESSAGES[locale]}
        timeZone={TIME_ZONE}
      >
        {children}
      </NextIntlClientProvider>
    );
  };
}

/** `render` inside the translation provider; Vietnamese unless told otherwise. */
export function renderWithIntl(
  ui: ReactElement,
  options: Omit<RenderOptions, "wrapper"> & { locale?: Locale } = {},
) {
  const { locale, ...rest } = options;
  return render(ui, { wrapper: intlWrapper(locale), ...rest });
}
