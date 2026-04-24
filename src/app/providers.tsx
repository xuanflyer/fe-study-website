"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StoreProvider } from "@/stores/StoreProvider";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>{children}</StoreProvider>
    </QueryClientProvider>
  );
}
