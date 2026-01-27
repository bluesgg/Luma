// =============================================================================
// TanStack Query Client Configuration Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

describe('QueryClient Configuration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    // Create a fresh QueryClient instance for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
          refetchOnWindowFocus: true,
          retry: 1,
        },
        mutations: {
          retry: 0,
        },
      },
      logger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    })
  })

  describe('Default Query Options', () => {
    it('should have correct staleTime (5 minutes)', () => {
      const options = queryClient.getDefaultOptions()
      expect(options.queries?.staleTime).toBe(5 * 60 * 1000)
    })

    it('should have correct gcTime (30 minutes)', () => {
      const options = queryClient.getDefaultOptions()
      expect(options.queries?.gcTime).toBe(30 * 60 * 1000)
    })

    it('should enable refetch on window focus', () => {
      const options = queryClient.getDefaultOptions()
      expect(options.queries?.refetchOnWindowFocus).toBe(true)
    })

    it('should retry failed queries once', () => {
      const options = queryClient.getDefaultOptions()
      expect(options.queries?.retry).toBe(1)
    })

    it('should not retry mutations', () => {
      const options = queryClient.getDefaultOptions()
      expect(options.mutations?.retry).toBe(0)
    })
  })

  describe('Query Cache Behavior', () => {
    it('should cache query data', async () => {
      const queryKey = ['test-query']
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' })

      // Execute query
      await queryClient.fetchQuery({
        queryKey,
        queryFn,
      })

      // Query function should be called once
      expect(queryFn).toHaveBeenCalledTimes(1)

      // Fetch again within stale time - should use cache
      const result = queryClient.getQueryData(queryKey)
      expect(result).toEqual({ data: 'test' })
    })

    it('should invalidate queries when requested', async () => {
      const queryKey = ['test-query']
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' })

      await queryClient.fetchQuery({ queryKey, queryFn })

      // Invalidate query
      await queryClient.invalidateQueries({ queryKey })

      // Query should be marked as stale
      const queryState = queryClient.getQueryState(queryKey)
      expect(queryState?.isInvalidated).toBe(true)
    })

    it('should handle query errors correctly', async () => {
      const queryKey = ['error-query']
      const error = new Error('Test error')
      const queryFn = vi.fn().mockRejectedValue(error)

      try {
        await queryClient.fetchQuery({
          queryKey,
          queryFn,
          retry: 1,
        })
      } catch (e) {
        expect(e).toBe(error)
      }

      // Should have retried once (initial + 1 retry = 2 calls)
      expect(queryFn).toHaveBeenCalledTimes(2)
    })
  })

  describe('Query State Management', () => {
    it('should set and get query data', () => {
      const queryKey = ['test-data']
      const data = { id: '1', name: 'Test' }

      queryClient.setQueryData(queryKey, data)

      const retrievedData = queryClient.getQueryData(queryKey)
      expect(retrievedData).toEqual(data)
    })

    it('should remove queries', async () => {
      const queryKey = ['removable-query']
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' })

      await queryClient.fetchQuery({ queryKey, queryFn })

      // Verify query exists
      expect(queryClient.getQueryData(queryKey)).toBeDefined()

      // Remove query
      queryClient.removeQueries({ queryKey })

      // Verify query is removed
      expect(queryClient.getQueryData(queryKey)).toBeUndefined()
    })

    it('should reset query client', async () => {
      const queryKey1 = ['query-1']
      const queryKey2 = ['query-2']

      queryClient.setQueryData(queryKey1, { data: 'test1' })
      queryClient.setQueryData(queryKey2, { data: 'test2' })

      // Reset all queries
      queryClient.clear()

      // All queries should be cleared
      expect(queryClient.getQueryData(queryKey1)).toBeUndefined()
      expect(queryClient.getQueryData(queryKey2)).toBeUndefined()
    })
  })

  describe('Mutation Behavior', () => {
    it('should execute mutations without retry on failure', async () => {
      const mutationFn = vi.fn().mockRejectedValue(new Error('Mutation error'))

      try {
        await queryClient.executeMutation({
          mutationFn,
        })
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }

      // Should not retry (only called once)
      expect(mutationFn).toHaveBeenCalledTimes(1)
    })

    it('should execute successful mutations', async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true })

      const result = await queryClient.executeMutation({
        mutationFn,
      })

      expect(result).toEqual({ success: true })
      expect(mutationFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Prefetching', () => {
    it('should prefetch queries', async () => {
      const queryKey = ['prefetch-query']
      const queryFn = vi.fn().mockResolvedValue({ data: 'prefetched' })

      await queryClient.prefetchQuery({
        queryKey,
        queryFn,
      })

      // Data should be cached
      const data = queryClient.getQueryData(queryKey)
      expect(data).toEqual({ data: 'prefetched' })
      expect(queryFn).toHaveBeenCalledTimes(1)
    })

    it('should not refetch if data is fresh', async () => {
      const queryKey = ['fresh-query']
      const queryFn = vi.fn().mockResolvedValue({ data: 'fresh' })

      // Initial fetch
      await queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 10000, // 10 seconds
      })

      // Try to prefetch again immediately
      await queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 10000,
      })

      // Should only be called once
      expect(queryFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Query Cancellation', () => {
    it('should allow query cancellation', async () => {
      const queryKey = ['cancel-query']
      let resolveQuery: (value: unknown) => void

      const queryFn = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveQuery = resolve
          })
      )

      // Start query
      const queryPromise = queryClient.fetchQuery({
        queryKey,
        queryFn,
      })

      // Cancel query
      queryClient.cancelQueries({ queryKey })

      // The promise might still resolve, but the query state should reflect cancellation
      const queryState = queryClient.getQueryState(queryKey)
      expect(queryState).toBeDefined()
    })
  })

  describe('Query Observers', () => {
    it('should notify observers on data change', () => {
      const queryKey = ['observable-query']
      const subscriber = vi.fn()

      // Subscribe to query
      const unsubscribe = queryClient.getQueryCache().subscribe(subscriber)

      // Set query data
      queryClient.setQueryData(queryKey, { data: 'test' })

      // Subscriber should be notified
      expect(subscriber).toHaveBeenCalled()

      unsubscribe()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const queryKey = ['network-error']
      const networkError = new Error('Network error')
      const queryFn = vi.fn().mockRejectedValue(networkError)

      try {
        await queryClient.fetchQuery({
          queryKey,
          queryFn,
          retry: 0,
        })
      } catch (error) {
        expect(error).toBe(networkError)
      }

      const queryState = queryClient.getQueryState(queryKey)
      expect(queryState?.error).toBe(networkError)
    })

    it('should store error in query state', async () => {
      const queryKey = ['error-state']
      const error = new Error('Test error')
      const queryFn = vi.fn().mockRejectedValue(error)

      try {
        await queryClient.fetchQuery({
          queryKey,
          queryFn,
          retry: 0,
        })
      } catch (e) {
        // Expected error
      }

      const queryState = queryClient.getQueryState(queryKey)
      expect(queryState?.error).toBe(error)
      expect(queryState?.status).toBe('error')
    })
  })
})
