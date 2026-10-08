import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Toaster } from "@/shared/ui/atoms/shadcn/sonner";
import { QueryProvider } from "@/shared/api/query-provider";
// Self-hosted Nunito and Geist Mono; see fonts/fonts.css.
import "./fonts/fonts.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("title"), description: t("description") };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // From the NEXT_LOCALE cookie; see src/shared/i18n/request.ts.
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <QueryProvider>{children}</QueryProvider>
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
