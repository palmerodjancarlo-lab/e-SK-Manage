// src/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Serve cached data instantly on revisit; refetch quietly in the background.
      staleTime: 60_000,          // 1 min — data is "fresh" and won't refetch on remount
      gcTime: 5 * 60_000,         // keep cache 5 min after a query is unused
      refetchOnWindowFocus: false, // don't re-hit the API every time the tab regains focus
      refetchOnReconnect: true,
      retry: 1,                   // one retry instead of the default 3 (no long hangs)
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 3000),
    },
    mutations: {
      retry: 0,
    },
  },
})