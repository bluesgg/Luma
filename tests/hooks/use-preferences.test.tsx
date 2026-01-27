// =============================================================================
// Phase 6: User Settings - usePreferences Hook Tests (TDD)
// Testing React hook for user preference management
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Hook to be implemented
interface UserPreference {
  id: string
  userId: string
  uiLocale: 'en' | 'zh'
  explainLocale: 'en' | 'zh'
  updatedAt: string
}

const usePreferences = () => ({
  preferences: undefined as UserPreference | undefined,
  isLoading: true,
  error: null as Error | null,
  updatePreferences: vi.fn(),
  isUpdating: false,
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

describe('usePreferences Hook (Phase 6 - SETTINGS-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Data Fetching', () => {
    it('should fetch preferences on mount', async () => {
      const mockPreferences = {
        id: 'pref-1',
        userId: 'user-1',
        uiLocale: 'en' as const,
        explainLocale: 'en' as const,
        updatedAt: new Date().toISOString(),
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      })

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences).toEqual(mockPreferences)
    })

    it('should set loading state initially', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.preferences).toBeUndefined()
    })

    it('should call correct API endpoint', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'en',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/preferences',
          expect.any(Object)
        )
      })
    })

    it('should cache preferences data', async () => {
      const mockData = {
        id: 'pref-1',
        userId: 'user-1',
        uiLocale: 'en' as const,
        explainLocale: 'en' as const,
        updatedAt: new Date().toISOString(),
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      const wrapper = createWrapper()

      const { result: result1 } = renderHook(() => usePreferences(), { wrapper })
      await waitFor(() => expect(result1.current.isLoading).toBe(false))

      ;(global.fetch as any).mockClear()

      const { result: result2 } = renderHook(() => usePreferences(), { wrapper })

      // Should use cached data, no new fetch
      expect(global.fetch).not.toHaveBeenCalled()
      expect(result2.current.preferences).toEqual(mockData)
    })
  })

  describe('Update Preferences Mutation', () => {
    it('should provide updatePreferences function', async () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      expect(result.current.updatePreferences).toBeDefined()
      expect(typeof result.current.updatePreferences).toBe('function')
    })

    it('should update UI locale', async () => {
      const initialData = {
        id: 'pref-1',
        userId: 'user-1',
        uiLocale: 'en' as const,
        explainLocale: 'en' as const,
        updatedAt: new Date().toISOString(),
      }

      const updatedData = {
        ...initialData,
        uiLocale: 'zh' as const,
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

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.updatePreferences({ uiLocale: 'zh' })
      })

      await waitFor(() => {
        expect(result.current.preferences?.uiLocale).toBe('zh')
      })
    })

    it('should update explain locale', async () => {
      const initialData = {
        id: 'pref-1',
        userId: 'user-1',
        uiLocale: 'en' as const,
        explainLocale: 'en' as const,
        updatedAt: new Date().toISOString(),
      }

      const updatedData = {
        ...initialData,
        explainLocale: 'zh' as const,
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

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.updatePreferences({ explainLocale: 'zh' })
      })

      await waitFor(() => {
        expect(result.current.preferences?.explainLocale).toBe('zh')
      })
    })

    it('should update both locales simultaneously', async () => {
      const initialData = {
        id: 'pref-1',
        userId: 'user-1',
        uiLocale: 'en' as const,
        explainLocale: 'en' as const,
        updatedAt: new Date().toISOString(),
      }

      const updatedData = {
        ...initialData,
        uiLocale: 'zh' as const,
        explainLocale: 'zh' as const,
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

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.updatePreferences({ uiLocale: 'zh', explainLocale: 'zh' })
      })

      await waitFor(() => {
        expect(result.current.preferences?.uiLocale).toBe('zh')
        expect(result.current.preferences?.explainLocale).toBe('zh')
      })
    })

    it('should call PATCH /api/preferences', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'zh',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      ;(global.fetch as any).mockClear()

      act(() => {
        result.current.updatePreferences({ uiLocale: 'zh' })
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/preferences',
          expect.objectContaining({
            method: 'PATCH',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({ uiLocale: 'zh' }),
          })
        )
      })
    })
  })

  describe('Optimistic Updates', () => {
    it('should optimistically update UI before API response', async () => {
      const initialData = {
        id: 'pref-1',
        userId: 'user-1',
        uiLocale: 'en' as const,
        explainLocale: 'en' as const,
        updatedAt: new Date().toISOString(),
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: initialData }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({
                      success: true,
                      data: { ...initialData, uiLocale: 'zh' },
                    }),
                  }),
                100
              )
            )
        )

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.updatePreferences({ uiLocale: 'zh' })
      })

      // Should update immediately (optimistic)
      await waitFor(
        () => {
          expect(result.current.preferences?.uiLocale).toBe('zh')
        },
        { timeout: 50 }
      )
    })

    it('should revert on error', async () => {
      const initialData = {
        id: 'pref-1',
        userId: 'user-1',
        uiLocale: 'en' as const,
        explainLocale: 'en' as const,
        updatedAt: new Date().toISOString(),
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: initialData }),
        })
        .mockRejectedValueOnce(new Error('Update failed'))

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.updatePreferences({ uiLocale: 'zh' })
      })

      // Should revert to original value after error
      await waitFor(() => {
        expect(result.current.preferences?.uiLocale).toBe('en')
      })
    })
  })

  describe('Loading States', () => {
    it('should show isUpdating during mutation', async () => {
      const initialData = {
        id: 'pref-1',
        userId: 'user-1',
        uiLocale: 'en' as const,
        explainLocale: 'en' as const,
        updatedAt: new Date().toISOString(),
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: initialData }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({
                      success: true,
                      data: { ...initialData, uiLocale: 'zh' },
                    }),
                  }),
                100
              )
            )
        )

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.updatePreferences({ uiLocale: 'zh' })
      })

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(true)
      })

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false)
      })
    })

    it('should clear isUpdating after success', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'zh',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.updatePreferences({ uiLocale: 'zh' })
      })

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false)
      })
    })

    it('should clear isUpdating after error', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .mockRejectedValueOnce(new Error('Failed'))

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.updatePreferences({ uiLocale: 'zh' })
      })

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false)
      })
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate cache after successful update', async () => {
      const initialData = {
        id: 'pref-1',
        userId: 'user-1',
        uiLocale: 'en' as const,
        explainLocale: 'en' as const,
        updatedAt: new Date().toISOString(),
      }

      const updatedData = {
        ...initialData,
        uiLocale: 'zh' as const,
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

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.updatePreferences({ uiLocale: 'zh' })
      })

      await waitFor(() => {
        expect(result.current.preferences?.uiLocale).toBe('zh')
      })
    })

    it('should refetch after mutation', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'zh',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const initialCallCount = (global.fetch as any).mock.calls.length

      act(() => {
        result.current.updatePreferences({ uiLocale: 'zh' })
      })

      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThan(
          initialCallCount
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })

      expect(result.current.error?.message).toContain('Network error')
    })

    it('should handle update errors', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .mockRejectedValueOnce(new Error('Update failed'))

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.updatePreferences({ uiLocale: 'zh' })
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })
    })

    it('should handle 401 unauthorized', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: { code: 'AUTH_UNAUTHORIZED' },
        }),
      })

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })
    })

    it('should handle 400 validation errors', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid locale' },
          }),
        })

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.updatePreferences({ uiLocale: 'invalid' as any })
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })
    })
  })

  describe('Auto-refresh', () => {
    it('should refetch on window focus', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'en',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      ;(global.fetch as any).mockClear()

      // Simulate window focus
      window.dispatchEvent(new Event('focus'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })

  describe('TypeScript Types', () => {
    it('should have correct return type', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      expect(result.current).toHaveProperty('preferences')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('updatePreferences')
      expect(result.current).toHaveProperty('isUpdating')
    })

    it('should enforce locale type constraints', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      // TypeScript should enforce 'en' | 'zh' for locales
      act(() => {
        result.current.updatePreferences({ uiLocale: 'en' })
        result.current.updatePreferences({ uiLocale: 'zh' })
        result.current.updatePreferences({ explainLocale: 'en' })
        result.current.updatePreferences({ explainLocale: 'zh' })
      })

      expect(true).toBe(true) // Type checking happens at compile time
    })
  })

  describe('Multiple Updates', () => {
    it('should handle rapid successive updates', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'zh',
            explainLocale: 'zh',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.updatePreferences({ uiLocale: 'zh' })
        result.current.updatePreferences({ explainLocale: 'zh' })
      })

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false)
      })
    })
  })
})
