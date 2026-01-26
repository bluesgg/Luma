'use client'

import { useState, useEffect, useCallback } from 'react'

const CSRF_HEADER_NAME = 'X-CSRF-Token'

interface UseCsrfResult {
  token: string | null
  isLoading: boolean
  error: Error | null
  refreshToken: () => Promise<void>
  getHeaders: () => Record<string, string>
}

/**
 * Hook to fetch and manage CSRF token for client-side forms
 *
 * Usage:
 * ```tsx
 * const { getHeaders, isLoading } = useCsrf()
 *
 * async function onSubmit(data) {
 *   await fetch('/api/endpoint', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       ...getHeaders(),
 *     },
 *     body: JSON.stringify(data),
 *   })
 * }
 * ```
 */
export function useCsrf(): UseCsrfResult {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchToken = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include', // Include cookies
      })

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token')
      }

      const data = await response.json()
      setToken(data.token)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  const refreshToken = useCallback(async () => {
    await fetchToken()
  }, [fetchToken])

  const getHeaders = useCallback((): Record<string, string> => {
    if (!token) {
      return {}
    }
    return {
      [CSRF_HEADER_NAME]: token,
    }
  }, [token])

  return {
    token,
    isLoading,
    error,
    refreshToken,
    getHeaders,
  }
}
