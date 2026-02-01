/**
 * Client-Side Providers
 *
 * Wraps the app with necessary providers:
 * - TanStack Query Provider
 */

'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/query-client'
import { useState } from 'react'

// Only import devtools in development
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? require('@tanstack/react-query-devtools').ReactQueryDevtools
    : () => null

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
