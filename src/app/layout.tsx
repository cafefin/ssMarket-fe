import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Geist_Mono, Nunito } from "next/font/google";
import { Toaster } from "@/shared/ui/atoms/shadcn/sonner";
import { QueryProvider } from "@/shared/api/query-provider";
import "./globals.css";

// One rounded, friendly family for headings, prices and body text, so digits
// look the same next to words everywhere.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("title"), description: t("description") };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // From the NEXT_LOCALE cookie; see src/shared/i18n/request.ts.
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${nunito.variable} ${geistMono.variable}`}
    >
      <body>
        <NextIntlClientProvider>
          <QueryProvider>{children}</QueryProvider>
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
