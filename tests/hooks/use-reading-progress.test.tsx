// =============================================================================
// READER-004: useReadingProgress Hook Tests (TDD)
// Hook for fetching and updating reading progress with debouncing
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Hook to be implemented
const useReadingProgress = (fileId: string | undefined) => ({
  currentPage: 1,
  setPage: vi.fn(),
  isLoading: true,
  isSaving: false,
  error: null,
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock API functions (to be implemented in src/lib/api/progress.ts)
vi.mock('@/lib/api/progress', () => ({
  getProgress: vi.fn(async (fileId: string) => ({
    currentPage: 1,
    updatedAt: new Date().toISOString(),
  })),
  updateProgress: vi.fn(async (fileId: string, currentPage: number) => ({
    currentPage,
    updatedAt: new Date().toISOString(),
  })),
}))

describe('useReadingProgress Hook (READER-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Initial Fetch', () => {
    it('should return loading state initially', () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.currentPage).toBe(1)
    })

    it('should fetch progress on mount', async () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.currentPage).toBeDefined()
    })

    it('should not fetch if fileId is undefined', () => {
      const { result } = renderHook(() => useReadingProgress(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.currentPage).toBe(1)
    })

    it('should not fetch if fileId is empty string', () => {
      const { result } = renderHook(() => useReadingProgress(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.currentPage).toBe(1)
    })

    it('should return fetched progress data', async () => {
      const { getProgress } = await import('@/lib/api/progress')
      vi.mocked(getProgress).mockResolvedValueOnce({
        currentPage: 15,
        updatedAt: new Date().toISOString(),
      })

      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.currentPage).toBe(15)
      })
    })

    it('should default to page 1 if no progress exists', async () => {
      const { getProgress } = await import('@/lib/api/progress')
      vi.mocked(getProgress).mockResolvedValueOnce({
        currentPage: 1,
        updatedAt: new Date().toISOString(),
      })

      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.currentPage).toBe(1)
      })
    })
  })

  describe('Set Page (Immediate Local Update)', () => {
    it('should provide setPage function', async () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.setPage).toBeDefined()
      expect(typeof result.current.setPage).toBe('function')
    })

    it('should update local state immediately', async () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(25)
      })

      // Should update immediately without waiting for server
      expect(result.current.currentPage).toBe(25)
    })

    it('should update UI immediately on multiple calls', async () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(10)
      })
      expect(result.current.currentPage).toBe(10)

      act(() => {
        result.current.setPage(20)
      })
      expect(result.current.currentPage).toBe(20)

      act(() => {
        result.current.setPage(30)
      })
      expect(result.current.currentPage).toBe(30)
    })

    it('should accept page 1', async () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(1)
      })

      expect(result.current.currentPage).toBe(1)
    })

    it('should accept large page numbers', async () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(500)
      })

      expect(result.current.currentPage).toBe(500)
    })
  })

  describe('Debounced Server Update (300ms)', () => {
    it('should debounce server updates to 300ms', async () => {
      const { updateProgress } = await import('@/lib/api/progress')
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(25)
      })

      // Should not call API immediately
      expect(updateProgress).not.toHaveBeenCalled()

      // Advance timers by 300ms
      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(updateProgress).toHaveBeenCalledWith('file-123', 25)
      })
    })

    it('should cancel previous debounced call on rapid updates', async () => {
      const { updateProgress } = await import('@/lib/api/progress')
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Rapid page updates
      act(() => {
        result.current.setPage(10)
      })

      act(() => {
        vi.advanceTimersByTime(100)
      })

      act(() => {
        result.current.setPage(20)
      })

      act(() => {
        vi.advanceTimersByTime(100)
      })

      act(() => {
        result.current.setPage(30)
      })

      // Advance full 300ms from last update
      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        // Should only call once with the last value
        expect(updateProgress).toHaveBeenCalledTimes(1)
        expect(updateProgress).toHaveBeenCalledWith('file-123', 30)
      })
    })

    it('should batch rapid page changes', async () => {
      const { updateProgress } = await import('@/lib/api/progress')
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Simulate user scrolling through pages rapidly
      act(() => {
        result.current.setPage(5)
        result.current.setPage(6)
        result.current.setPage(7)
        result.current.setPage(8)
        result.current.setPage(9)
        result.current.setPage(10)
      })

      // Advance 300ms
      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        // Should only send final page to server
        expect(updateProgress).toHaveBeenCalledTimes(1)
        expect(updateProgress).toHaveBeenCalledWith('file-123', 10)
      })
    })

    it('should handle multiple separate updates correctly', async () => {
      const { updateProgress } = await import('@/lib/api/progress')
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // First update
      act(() => {
        result.current.setPage(10)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(updateProgress).toHaveBeenCalledWith('file-123', 10)
      })

      // Second update after debounce completes
      act(() => {
        result.current.setPage(20)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(updateProgress).toHaveBeenCalledWith('file-123', 20)
        expect(updateProgress).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Saving State', () => {
    it('should set isSaving to true while saving', async () => {
      const { updateProgress } = await import('@/lib/api/progress')
      vi.mocked(updateProgress).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(25)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(result.current.isSaving).toBe(true)
      })
    })

    it('should set isSaving to false after save completes', async () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(25)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false)
      })
    })

    it('should not block UI while saving', async () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(25)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Should be able to update local state while saving
      act(() => {
        result.current.setPage(30)
      })

      expect(result.current.currentPage).toBe(30)
    })
  })

  describe('Error Handling', () => {
    it('should set error state on fetch failure', async () => {
      const { getProgress } = await import('@/lib/api/progress')
      vi.mocked(getProgress).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeDefined()
      })
    })

    it('should handle 404 file not found', async () => {
      const { getProgress } = await import('@/lib/api/progress')
      vi.mocked(getProgress).mockRejectedValueOnce({
        status: 404,
        message: 'File not found',
      })

      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })
    })

    it('should handle 403 forbidden', async () => {
      const { getProgress } = await import('@/lib/api/progress')
      vi.mocked(getProgress).mockRejectedValueOnce({
        status: 403,
        message: 'Forbidden',
      })

      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })
    })

    it('should keep local state on save failure', async () => {
      const { updateProgress } = await import('@/lib/api/progress')
      vi.mocked(updateProgress).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(25)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        // Local state should remain even if save fails
        expect(result.current.currentPage).toBe(25)
        expect(result.current.isSaving).toBe(false)
      })
    })

    it('should retry failed saves on next update', async () => {
      const { updateProgress } = await import('@/lib/api/progress')
      vi.mocked(updateProgress)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          currentPage: 30,
          updatedAt: new Date().toISOString(),
        })

      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // First update fails
      act(() => {
        result.current.setPage(25)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false)
      })

      // Second update succeeds
      act(() => {
        result.current.setPage(30)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(updateProgress).toHaveBeenCalledWith('file-123', 30)
      })
    })
  })

  describe('Loading States', () => {
    it('should have separate loading and saving states', async () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      // Initial loading
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isSaving).toBe(false)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // After load, both should be false
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSaving).toBe(false)
    })

    it('should not show loading on subsequent fetches', async () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Update should not trigger loading state
      act(() => {
        result.current.setPage(25)
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Query Caching', () => {
    it('should cache progress data', async () => {
      const { getProgress } = await import('@/lib/api/progress')
      const wrapper = createWrapper()

      const { result: result1 } = renderHook(
        () => useReadingProgress('file-123'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false)
      })

      // Second hook should use cache
      const { result: result2 } = renderHook(
        () => useReadingProgress('file-123'),
        { wrapper }
      )

      expect(result2.current.isLoading).toBe(false)
      expect(getProgress).toHaveBeenCalledTimes(1)
    })

    it('should use different cache for different files', async () => {
      const wrapper = createWrapper()

      const { result: result1 } = renderHook(
        () => useReadingProgress('file-1'),
        { wrapper }
      )

      const { result: result2 } = renderHook(
        () => useReadingProgress('file-2'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false)
        expect(result2.current.isLoading).toBe(false)
      })

      // Should maintain separate state
      act(() => {
        result1.current.setPage(10)
        result2.current.setPage(20)
      })

      expect(result1.current.currentPage).toBe(10)
      expect(result2.current.currentPage).toBe(20)
    })

    it('should have stale time of 30 seconds', async () => {
      const { getProgress } = await import('@/lib/api/progress')
      const wrapper = createWrapper()

      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should not refetch within stale time
      const callCount = vi.mocked(getProgress).mock.calls.length

      act(() => {
        vi.advanceTimersByTime(20000) // 20 seconds
      })

      expect(vi.mocked(getProgress).mock.calls.length).toBe(callCount)
    })
  })

  describe('FileId Changes', () => {
    it('should refetch when fileId changes', async () => {
      const { getProgress } = await import('@/lib/api/progress')
      const { result, rerender } = renderHook(
        ({ fileId }) => useReadingProgress(fileId),
        {
          wrapper: createWrapper(),
          initialProps: { fileId: 'file-1' },
        }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Change fileId
      rerender({ fileId: 'file-2' })

      await waitFor(() => {
        expect(getProgress).toHaveBeenCalledWith('file-2')
      })
    })

    it('should reset local state when fileId changes', async () => {
      const { result, rerender } = renderHook(
        ({ fileId }) => useReadingProgress(fileId),
        {
          wrapper: createWrapper(),
          initialProps: { fileId: 'file-1' },
        }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(25)
      })

      expect(result.current.currentPage).toBe(25)

      // Change fileId
      rerender({ fileId: 'file-2' })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        // Should reset to new file's progress
        expect(result.current.currentPage).toBeDefined()
      })
    })

    it('should cancel pending saves when fileId changes', async () => {
      const { updateProgress } = await import('@/lib/api/progress')
      const { result, rerender } = renderHook(
        ({ fileId }) => useReadingProgress(fileId),
        {
          wrapper: createWrapper(),
          initialProps: { fileId: 'file-1' },
        }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(25)
      })

      // Change fileId before debounce completes
      rerender({ fileId: 'file-2' })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Should not save to old file
      expect(updateProgress).not.toHaveBeenCalledWith('file-1', 25)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined fileId gracefully', () => {
      const { result } = renderHook(() => useReadingProgress(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.currentPage).toBe(1)
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle null fileId gracefully', () => {
      const { result } = renderHook(
        () => useReadingProgress(null as unknown as string),
        {
          wrapper: createWrapper(),
        }
      )

      expect(result.current.currentPage).toBe(1)
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle rapid mount/unmount', async () => {
      const { unmount } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      unmount()

      // Should not throw errors
      expect(true).toBe(true)
    })

    it('should cleanup debounce on unmount', async () => {
      const { updateProgress } = await import('@/lib/api/progress')
      const { result, unmount } = renderHook(
        () => useReadingProgress('file-123'),
        {
          wrapper: createWrapper(),
        }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(25)
      })

      unmount()

      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Should not call API after unmount
      expect(updateProgress).not.toHaveBeenCalled()
    })
  })

  describe('TypeScript Types', () => {
    it('should have correct type for currentPage', async () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const page: number = result.current.currentPage
      expect(typeof page).toBe('number')
    })

    it('should have correct type for setPage', async () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const setPage: (page: number) => void = result.current.setPage
      expect(typeof setPage).toBe('function')
    })

    it('should have correct type for error', async () => {
      const { result } = renderHook(() => useReadingProgress('file-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const error: Error | null = result.current.error as Error | null
      expect(error === null || error instanceof Error).toBe(true)
    })
  })
})
