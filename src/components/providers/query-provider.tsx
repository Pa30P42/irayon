'use client';
// Client component: instantiates a per-session QueryClient.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // 60s of cache freshness keeps the listings page snappy without going stale on the user.
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState ensures we keep the same client across renders without a global
  // singleton (which would leak between requests in SSR).
  const [client] = useState(makeClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
