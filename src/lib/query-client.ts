/**
 * TanStack Query Client Configuration
 *
 * Centralized configuration for React Query with proper defaults
 */

import { QueryClient } from '@tanstack/react-query'

/**
 * Create a new QueryClient instance with default options
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time: How long until data is considered stale and needs refetching
        staleTime: 5 * 60 * 1000, // 5 minutes

        // GC time: How long until inactive query results are garbage collected
        gcTime: 30 * 60 * 1000, // 30 minutes (previously cacheTime)

        // Refetch on window focus to keep data fresh
        refetchOnWindowFocus: true,

        // Retry failed requests once
        retry: 1,

        // Don't retry on 4xx errors
        retryOnMount: false,
      },
      mutations: {
        // Retry mutations once
        retry: 1,
      },
    },
  })
}

// Browser-side QueryClient singleton
let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}
