'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { logger } from '@/lib/logger'

/**
 * TUTOR-025: SSE Connection Handler Hook
 *
 * Hook for managing Server-Sent Events connections with:
 * - Auto-reconnect with exponential backoff (3 retries)
 * - Connection state management
 * - Error handling
 * - Cleanup on unmount
 */

export type SSEConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

export interface UseSSEOptions {
  onMessage: (data: any) => void
  onError?: (error: Error) => void
  onOpen?: () => void
  onClose?: () => void
  maxRetries?: number
  retryDelay?: number
}

export interface UseSSEResult {
  state: SSEConnectionState
  error: Error | null
  connect: () => void
  disconnect: () => void
  retry: () => void
}

/**
 * Hook for SSE connection management
 */
export function useSSE(url: string, options: UseSSEOptions): UseSSEResult {
  const {
    onMessage,
    onError,
    onOpen,
    onClose,
    maxRetries = 3,
    retryDelay = 1000,
  } = options

  const [state, setState] = useState<SSEConnectionState>('disconnected')
  const [error, setError] = useState<Error | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isManualDisconnectRef = useRef(false)

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return
    }

    setState('connecting')
    setError(null)
    isManualDisconnectRef.current = false

    try {
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      // Handle connection open
      eventSource.onopen = () => {
        setState('connected')
        retryCountRef.current = 0
        logger.info('SSE connection opened', { url })
        onOpen?.()
      }

      // Handle messages
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage(data)
        } catch (err) {
          logger.error('Failed to parse SSE message', err)
        }
      }

      // Handle errors
      eventSource.onerror = (event) => {
        const err = new Error('SSE connection error')
        setError(err)
        setState('error')

        logger.error('SSE connection error', { url, event })

        // Close the connection
        eventSource.close()
        eventSourceRef.current = null

        onError?.(err)

        // Attempt retry if not manually disconnected
        if (
          !isManualDisconnectRef.current &&
          retryCountRef.current < maxRetries
        ) {
          const delay = retryDelay * Math.pow(2, retryCountRef.current)
          retryCountRef.current += 1

          logger.info('Retrying SSE connection', {
            attempt: retryCountRef.current,
            maxRetries,
            delay,
          })

          retryTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else if (retryCountRef.current >= maxRetries) {
          logger.error('SSE max retries exceeded', { url, maxRetries })
          onClose?.()
        }
      }
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Failed to create SSE connection')
      setError(error)
      setState('error')
      logger.error('Failed to create SSE connection', err)
      onError?.(error)
    }
  }, [url, onMessage, onError, onOpen, onClose, maxRetries, retryDelay])

  /**
   * Disconnect from SSE endpoint
   */
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      logger.info('SSE connection closed', { url })
    }

    setState('disconnected')
    retryCountRef.current = 0
    onClose?.()
  }, [url, onClose])

  /**
   * Manually retry connection
   */
  const retry = useCallback(() => {
    disconnect()
    retryCountRef.current = 0
    setTimeout(() => {
      connect()
    }, 100)
  }, [connect, disconnect])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    state,
    error,
    connect,
    disconnect,
    retry,
  }
}

/**
 * Hook for SSE with auto-connect on mount
 */
export function useSSEAutoConnect(
  url: string,
  options: UseSSEOptions
): UseSSEResult {
  const sse = useSSE(url, options)

  useEffect(() => {
    sse.connect()
    return () => {
      sse.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return sse
}
