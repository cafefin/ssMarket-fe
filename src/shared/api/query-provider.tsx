"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  // One client per browser session; created in state so it survives re-renders.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The API client already retries once after refreshing the session.
            retry: false,
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
