import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Bricolage_Grotesque, Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/shared/ui/atoms/shadcn/sonner";
import { QueryProvider } from "@/shared/api/query-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Headings, prices and the wordmark.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "vietnamese"],
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
      className={`${inter.variable} ${geistMono.variable} ${bricolage.variable}`}
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
