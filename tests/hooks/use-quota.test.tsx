// =============================================================================
// Phase 5: Quota Management - useQuota Hook Tests (TDD)
// Testing React hook for quota data management
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Hook to be implemented
interface QuotaData {
  learningInteractions: {
    used: number
    limit: number
    remaining: number
    percentage: number
    resetAt: Date
    status: 'green' | 'yellow' | 'red'
  }
  autoExplain: {
    used: number
    limit: number
    remaining: number
    percentage: number
    resetAt: Date
    status: 'green' | 'yellow' | 'red'
  }
}

const useQuota = () => ({
  data: undefined as QuotaData | undefined,
  isLoading: true,
  error: null as Error | null,
  isQuotaLow: vi.fn(),
  isQuotaExceeded: vi.fn(),
  canConsumeQuota: vi.fn(),
  invalidate: vi.fn(),
  refetch: vi.fn(),
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useQuota Hook (Phase 5 - QUOTA-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch API
    global.fetch = vi.fn()
  })

  describe('Data Fetching', () => {
    it('should fetch quota data on mount', async () => {
      const mockData = {
        learningInteractions: {
          used: 50,
          limit: 150,
          remaining: 100,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
        autoExplain: {
          used: 100,
          limit: 300,
          remaining: 200,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockData)
    })

    it('should set loading state initially', () => {
      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()
    })

    it('should handle fetch errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })

      expect(result.current.error?.message).toContain('Network error')
    })

    it('should call correct API endpoint', async () => {
      renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/quota', expect.any(Object))
      })
    })

    it('should cache quota data', async () => {
      const mockData = {
        learningInteractions: {
          used: 50,
          limit: 150,
          remaining: 100,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
        autoExplain: {
          used: 100,
          limit: 300,
          remaining: 200,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      const { result, rerender } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Clear fetch mock
      ;(global.fetch as any).mockClear()

      // Rerender should use cached data
      rerender()

      expect(global.fetch).not.toHaveBeenCalled()
      expect(result.current.data).toEqual(mockData)
    })
  })

  describe('Helper Functions', () => {
    it('should provide isQuotaLow function', async () => {
      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isQuotaLow).toBeDefined()
      expect(typeof result.current.isQuotaLow).toBe('function')
    })

    it('should check if quota is low (<20% remaining)', async () => {
      const mockData = {
        learningInteractions: {
          used: 130,
          limit: 150,
          remaining: 20,
          percentage: 87,
          resetAt: new Date(),
          status: 'yellow' as const,
        },
        autoExplain: {
          used: 250,
          limit: 300,
          remaining: 50,
          percentage: 83,
          resetAt: new Date(),
          status: 'yellow' as const,
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const isLow = result.current.isQuotaLow('LEARNING_INTERACTIONS')
      expect(isLow).toBe(true) // 20/150 = 13.3% remaining
    })

    it('should provide isQuotaExceeded function', () => {
      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isQuotaExceeded).toBeDefined()
      expect(typeof result.current.isQuotaExceeded).toBe('function')
    })

    it('should check if quota is exceeded', async () => {
      const mockData = {
        learningInteractions: {
          used: 150,
          limit: 150,
          remaining: 0,
          percentage: 100,
          resetAt: new Date(),
          status: 'red' as const,
        },
        autoExplain: {
          used: 200,
          limit: 300,
          remaining: 100,
          percentage: 67,
          resetAt: new Date(),
          status: 'green' as const,
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const isExceeded = result.current.isQuotaExceeded('LEARNING_INTERACTIONS')
      expect(isExceeded).toBe(true)
    })

    it('should provide canConsumeQuota function', () => {
      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      expect(result.current.canConsumeQuota).toBeDefined()
      expect(typeof result.current.canConsumeQuota).toBe('function')
    })

    it('should check if user can consume quota', async () => {
      const mockData = {
        learningInteractions: {
          used: 50,
          limit: 150,
          remaining: 100,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
        autoExplain: {
          used: 200,
          limit: 300,
          remaining: 100,
          percentage: 67,
          resetAt: new Date(),
          status: 'green' as const,
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const canConsume = result.current.canConsumeQuota('LEARNING_INTERACTIONS', 10)
      expect(canConsume).toBe(true) // 100 remaining >= 10
    })

    it('should return false when requested amount exceeds remaining', async () => {
      const mockData = {
        learningInteractions: {
          used: 145,
          limit: 150,
          remaining: 5,
          percentage: 97,
          resetAt: new Date(),
          status: 'red' as const,
        },
        autoExplain: {
          used: 200,
          limit: 300,
          remaining: 100,
          percentage: 67,
          resetAt: new Date(),
          status: 'green' as const,
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const canConsume = result.current.canConsumeQuota('LEARNING_INTERACTIONS', 10)
      expect(canConsume).toBe(false) // 5 remaining < 10
    })
  })

  describe('Invalidation and Refetch', () => {
    it('should provide invalidate function', () => {
      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      expect(result.current.invalidate).toBeDefined()
      expect(typeof result.current.invalidate).toBe('function')
    })

    it('should trigger refetch on invalidate', async () => {
      const mockData = {
        learningInteractions: {
          used: 50,
          limit: 150,
          remaining: 100,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
        autoExplain: {
          used: 100,
          limit: 300,
          remaining: 200,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Clear fetch mock
      ;(global.fetch as any).mockClear()

      // Invalidate
      act(() => {
        result.current.invalidate()
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('should provide refetch function', () => {
      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      expect(result.current.refetch).toBeDefined()
      expect(typeof result.current.refetch).toBe('function')
    })

    it('should refetch data manually', async () => {
      const initialData = {
        learningInteractions: {
          used: 50,
          limit: 150,
          remaining: 100,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
        autoExplain: {
          used: 100,
          limit: 300,
          remaining: 200,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
      }

      const updatedData = {
        ...initialData,
        learningInteractions: {
          ...initialData.learningInteractions,
          used: 60,
          remaining: 90,
          percentage: 40,
        },
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: initialData }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: updatedData }),
        })

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data?.learningInteractions.used).toBe(50)
      })

      act(() => {
        result.current.refetch()
      })

      await waitFor(() => {
        expect(result.current.data?.learningInteractions.used).toBe(60)
      })
    })
  })

  describe('Auto-refresh', () => {
    it('should auto-refresh on window focus', async () => {
      const mockData = {
        learningInteractions: {
          used: 50,
          limit: 150,
          remaining: 100,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
        autoExplain: {
          used: 100,
          limit: 300,
          remaining: 200,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      // Clear mock
      ;(global.fetch as any).mockClear()

      // Simulate window focus
      window.dispatchEvent(new Event('focus'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('should not refetch when stale time has not elapsed', async () => {
      const mockData = {
        learningInteractions: {
          used: 50,
          limit: 150,
          remaining: 100,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
        autoExplain: {
          used: 100,
          limit: 300,
          remaining: 200,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      const { rerender } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      // Clear mock
      ;(global.fetch as any).mockClear()

      // Immediate rerender should use cache
      rerender()

      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle 401 unauthorized error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: { code: 'AUTH_UNAUTHORIZED' } }),
      })

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })
    })

    it('should handle 500 server error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: { code: 'INTERNAL_SERVER_ERROR' } }),
      })

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })
    })

    it('should handle network errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Failed to fetch'))

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })

      expect(result.current.error?.message).toContain('Failed to fetch')
    })

    it('should set data to undefined on error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })

      expect(result.current.data).toBeUndefined()
    })
  })

  describe('Loading States', () => {
    it('should set isLoading to false after successful fetch', async () => {
      const mockData = {
        learningInteractions: {
          used: 50,
          limit: 150,
          remaining: 100,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
        autoExplain: {
          used: 100,
          limit: 300,
          remaining: 200,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should set isLoading to false after error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should maintain data during background refetch', async () => {
      const initialData = {
        learningInteractions: {
          used: 50,
          limit: 150,
          remaining: 100,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
        autoExplain: {
          used: 100,
          limit: 300,
          remaining: 200,
          percentage: 33,
          resetAt: new Date(),
          status: 'green' as const,
        },
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: initialData }),
      })

      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      // Trigger refetch
      act(() => {
        result.current.refetch()
      })

      // Data should still be available during refetch
      expect(result.current.data).toBeDefined()
    })
  })

  describe('TypeScript Types', () => {
    it('should have correct return type', () => {
      const { result } = renderHook(() => useQuota(), {
        wrapper: createWrapper(),
      })

      const quota = result.current
      expect(quota).toHaveProperty('data')
      expect(quota).toHaveProperty('isLoading')
      expect(quota).toHaveProperty('error')
      expect(quota).toHaveProperty('isQuotaLow')
      expect(quota).toHaveProperty('isQuotaExceeded')
      expect(quota).toHaveProperty('canConsumeQuota')
      expect(quota).toHaveProperty('invalidate')
      expect(quota).toHaveProperty('refetch')
    })
  })
})
