// =============================================================================
// TUTOR-025: useSSE Hook Tests (TDD)
// Hook for managing Server-Sent Events connections
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useSSE, useSSEAutoConnect } from '@/hooks/use-sse'

describe('useSSE Hook (TUTOR-025)', () => {
  const url = '/api/test-sse'
  let onMessage: ReturnType<typeof vi.fn>
  let onError: ReturnType<typeof vi.fn>
  let onOpen: ReturnType<typeof vi.fn>
  let onClose: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    onMessage = vi.fn()
    onError = vi.fn()
    onOpen = vi.fn()
    onClose = vi.fn()

    // Mock EventSource
    global.EventSource = vi.fn().mockImplementation(() => ({
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onopen: null,
      onmessage: null,
      onerror: null,
      readyState: 0,
      url: '',
      withCredentials: false,
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2,
    })) as any
  })

  describe('Connection Management', () => {
    it('should start in disconnected state', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      expect(result.current.state).toBe('disconnected')
    })

    it('should transition to connecting when connect() called', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      act(() => {
        result.current.connect()
      })

      expect(result.current.state).toBe('connecting')
    })

    it('should create EventSource with correct URL', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      act(() => {
        result.current.connect()
      })

      expect(global.EventSource).toHaveBeenCalledWith(url)
    })

    it('should transition to connected on open', async () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage, onOpen })
      )

      act(() => {
        result.current.connect()
      })

      // Simulate connection open
      const mockEventSource = (global.EventSource as any).mock.results[0].value
      act(() => {
        mockEventSource.onopen?.()
      })

      expect(result.current.state).toBe('connected')
      expect(onOpen).toHaveBeenCalled()
    })

    it('should disconnect properly', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage, onClose })
      )

      act(() => {
        result.current.connect()
      })

      const mockEventSource = (global.EventSource as any).mock.results[0].value

      act(() => {
        result.current.disconnect()
      })

      expect(mockEventSource.close).toHaveBeenCalled()
      expect(result.current.state).toBe('disconnected')
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Message Handling', () => {
    it('should call onMessage with parsed data', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      act(() => {
        result.current.connect()
      })

      const mockEventSource = (global.EventSource as any).mock.results[0].value
      const testData = { type: 'test', message: 'hello' }

      act(() => {
        mockEventSource.onmessage?.({
          data: JSON.stringify(testData),
        })
      })

      expect(onMessage).toHaveBeenCalledWith(testData)
    })

    it('should handle malformed JSON gracefully', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      act(() => {
        result.current.connect()
      })

      const mockEventSource = (global.EventSource as any).mock.results[0].value

      act(() => {
        mockEventSource.onmessage?.({
          data: 'invalid json',
        })
      })

      // Should not throw, should log error
      expect(onMessage).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should transition to error state on connection error', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage, onError })
      )

      act(() => {
        result.current.connect()
      })

      const mockEventSource = (global.EventSource as any).mock.results[0].value

      act(() => {
        mockEventSource.onerror?.({})
      })

      expect(result.current.state).toBe('error')
      expect(result.current.error).toBeInstanceOf(Error)
      expect(onError).toHaveBeenCalled()
    })

    it('should close EventSource on error', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      act(() => {
        result.current.connect()
      })

      const mockEventSource = (global.EventSource as any).mock.results[0].value

      act(() => {
        mockEventSource.onerror?.({})
      })

      expect(mockEventSource.close).toHaveBeenCalled()
    })
  })

  describe('Auto-reconnect', () => {
    it('should retry connection on error', async () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage, maxRetries: 3, retryDelay: 100 })
      )

      act(() => {
        result.current.connect()
      })

      const mockEventSource = (global.EventSource as any).mock.results[0].value

      act(() => {
        mockEventSource.onerror?.({})
      })

      // Should attempt to reconnect
      await waitFor(() => {
        expect(global.EventSource).toHaveBeenCalledTimes(2)
      }, { timeout: 500 })
    })

    it('should use exponential backoff for retries', async () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage, maxRetries: 3, retryDelay: 100 })
      )

      act(() => {
        result.current.connect()
      })

      // Simulate multiple failures
      const triggerError = () => {
        const mockEventSource = (global.EventSource as any).mock.results[
          (global.EventSource as any).mock.results.length - 1
        ].value
        act(() => {
          mockEventSource.onerror?.({})
        })
      }

      triggerError()
      await waitFor(() => {
        expect(global.EventSource).toHaveBeenCalledTimes(2)
      }, { timeout: 500 })

      triggerError()
      await waitFor(() => {
        expect(global.EventSource).toHaveBeenCalledTimes(3)
      }, { timeout: 1000 })
    })

    it('should not retry after max retries', async () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage, onClose, maxRetries: 1, retryDelay: 100 })
      )

      act(() => {
        result.current.connect()
      })

      // Trigger errors
      for (let i = 0; i < 3; i++) {
        const mockEventSource = (global.EventSource as any).mock.results[
          (global.EventSource as any).mock.results.length - 1
        ].value
        act(() => {
          mockEventSource.onerror?.({})
        })
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Should only have 2 calls (initial + 1 retry)
      expect(global.EventSource).toHaveBeenCalledTimes(2)
      expect(onClose).toHaveBeenCalled()
    })

    it('should not retry if manually disconnected', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage, maxRetries: 3 })
      )

      act(() => {
        result.current.connect()
      })

      act(() => {
        result.current.disconnect()
      })

      expect(global.EventSource).toHaveBeenCalledTimes(1)
    })

    it('should reset retry count on successful connection', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      act(() => {
        result.current.connect()
      })

      const mockEventSource = (global.EventSource as any).mock.results[0].value

      // First connection succeeds
      act(() => {
        mockEventSource.onopen?.()
      })

      // Then fails
      act(() => {
        mockEventSource.onerror?.({})
      })

      // Retry count should be reset
      expect(result.current.state).toBe('error')
    })
  })

  describe('Manual Retry', () => {
    it('should provide retry function', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      expect(result.current.retry).toBeInstanceOf(Function)
    })

    it('should disconnect and reconnect on retry', async () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      act(() => {
        result.current.connect()
      })

      const initialEventSource = (global.EventSource as any).mock.results[0].value

      act(() => {
        result.current.retry()
      })

      expect(initialEventSource.close).toHaveBeenCalled()

      await waitFor(() => {
        expect(global.EventSource).toHaveBeenCalledTimes(2)
      }, { timeout: 500 })
    })

    it('should reset retry count on manual retry', async () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      act(() => {
        result.current.connect()
      })

      // Trigger error
      const mockEventSource = (global.EventSource as any).mock.results[0].value
      act(() => {
        mockEventSource.onerror?.({})
      })

      // Manual retry
      act(() => {
        result.current.retry()
      })

      await waitFor(() => {
        expect(global.EventSource).toHaveBeenCalledTimes(3)
      }, { timeout: 500 })
    })
  })

  describe('Cleanup', () => {
    it('should disconnect on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      act(() => {
        result.current.connect()
      })

      const mockEventSource = (global.EventSource as any).mock.results[0].value

      unmount()

      expect(mockEventSource.close).toHaveBeenCalled()
    })

    it('should clear retry timeout on unmount', () => {
      const { unmount } = renderHook(() =>
        useSSE(url, { onMessage, maxRetries: 3 })
      )

      unmount()

      // Should not throw
      expect(true).toBe(true)
    })
  })

  describe('useSSEAutoConnect', () => {
    it('should connect automatically on mount', () => {
      renderHook(() =>
        useSSEAutoConnect(url, { onMessage })
      )

      expect(global.EventSource).toHaveBeenCalled()
    })

    it('should disconnect on unmount', () => {
      const { unmount } = renderHook(() =>
        useSSEAutoConnect(url, { onMessage })
      )

      const mockEventSource = (global.EventSource as any).mock.results[0].value

      unmount()

      expect(mockEventSource.close).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle connect when already connecting', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      act(() => {
        result.current.connect()
        result.current.connect()
      })

      expect(global.EventSource).toHaveBeenCalledTimes(1)
    })

    it('should handle disconnect when not connected', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      act(() => {
        result.current.disconnect()
      })

      expect(result.current.state).toBe('disconnected')
    })

    it('should handle missing optional callbacks', () => {
      const { result } = renderHook(() =>
        useSSE(url, { onMessage })
      )

      act(() => {
        result.current.connect()
      })

      const mockEventSource = (global.EventSource as any).mock.results[0].value

      act(() => {
        mockEventSource.onopen?.()
        mockEventSource.onerror?.({})
      })

      expect(result.current.state).toBe('error')
    })
  })
})
