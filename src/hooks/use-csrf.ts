'use client'

import { useQuery } from '@tanstack/react-query'

interface UseCsrfResult {
  csrfToken: string | null
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * Hook to get CSRF token for API requests
 */
export function useCsrf(): UseCsrfResult {
  const { data, isLoading, isError, error } = useQuery<
    { success: boolean; data: { csrfToken: string } },
    Error
  >({
    queryKey: ['csrf'],
    queryFn: async () => {
      const response = await fetch('/api/csrf')

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token')
      }

      return response.json()
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 3,
  })

  return {
    csrfToken: data?.data.csrfToken || null,
    isLoading,
    isError,
    error,
  }
}

/**
 * Helper to create fetch options with CSRF token
 */
export function withCsrf(
  options: RequestInit,
  csrfToken: string | null
): RequestInit {
  if (!csrfToken) return options

  return {
    ...options,
    headers: {
      ...options.headers,
      'x-csrf-token': csrfToken,
    },
  }
}
