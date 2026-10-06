import type { ReactNode } from "react";
import { AppHeader, MobileTabBar } from "@/features/shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      {/* The bottom padding keeps content clear of the fixed tab bar. */}
      <main className="pb-24 md:pb-0">{children}</main>
      <MobileTabBar />
    </div>
  );
}
