import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/query/query-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ssMarket",
  description: "Sàn mua bán nội bộ dành cho nhân viên.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${inter.variable} ${geistMono.variable}`}>
      <body>
        <QueryProvider>{children}</QueryProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
