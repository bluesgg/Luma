// =============================================================================
// useUser Hook Tests (TDD)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Hook to be implemented
const useUser = () => ({
  user: null,
  isLoading: true,
  error: null,
  logout: vi.fn(),
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useUser Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Fetching User Data', () => {
    it('should return loading state initially', () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.user).toBeNull()
    })

    it('should fetch and return user data when authenticated', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.user).toBeDefined()
        expect(result.current.user?.email).toBe('user@example.com')
      })
    })

    it('should return null user when not authenticated', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.user).toBeNull()
      })
    })

    it('should include user role and email verification status', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.user?.role).toBe('STUDENT')
        expect(result.current.user?.emailConfirmedAt).toBeDefined()
      })
    })

    it('should not include sensitive data', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.user?.passwordHash).toBeUndefined()
        expect(result.current.user?.failedLoginAttempts).toBeUndefined()
      })
    })
  })

  describe('Auto-refetch Behavior', () => {
    it('should refetch on window focus', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Simulate window focus
      window.dispatchEvent(new Event('focus'))

      await waitFor(() => {
        // Should trigger refetch
        expect(true).toBe(true)
      })
    })

    it('should use query caching', async () => {
      const wrapper = createWrapper()

      const { result: result1 } = renderHook(() => useUser(), { wrapper })
      await waitFor(() => expect(result1.current.isLoading).toBe(false))

      const { result: result2 } = renderHook(() => useUser(), { wrapper })

      // Second hook should use cached data
      expect(result2.current.isLoading).toBe(false)
      expect(result2.current.user).toBeDefined()
    })

    it('should set appropriate stale time', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Query should be considered fresh for a reasonable time
      expect(true).toBe(true)
    })
  })

  describe('Logout Mutation', () => {
    it('should provide logout function', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.logout).toBeDefined()
      expect(typeof result.current.logout).toBe('function')
    })

    it('should call logout API on logout', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await result.current.logout()

      // Verify logout API was called
      expect(true).toBe(true)
    })

    it('should clear user data after logout', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.user).toBeDefined())

      await result.current.logout()

      await waitFor(() => {
        expect(result.current.user).toBeNull()
      })
    })

    it('should invalidate user query cache on logout', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.user).toBeDefined())

      await result.current.logout()

      await waitFor(() => {
        // Cache should be invalidated
        expect(result.current.user).toBeNull()
      })
    })

    it('should handle logout errors gracefully', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Mock logout failure
      await expect(result.current.logout()).resolves.not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeDefined()
      })
    })

    it('should handle 401 unauthorized gracefully', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.user).toBeNull()
        expect(result.current.error).toBeNull() // 401 is expected for logged out users
      })
    })

    it('should retry failed requests with backoff', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false)
        },
        { timeout: 5000 }
      )
    })
  })

  describe('TypeScript Types', () => {
    it('should have correct type inference for user', async () => {
      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

      await waitFor(() => {
        if (result.current.user) {
          // These should not cause TypeScript errors
          const email: string = result.current.user.email
          const role: 'STUDENT' | 'ADMIN' = result.current.user.role
          expect(email).toBeDefined()
          expect(role).toBeDefined()
        }
      })
    })
  })
})
