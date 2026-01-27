/**
 * READER-004: useReadingProgress Hook
 *
 * Hook for fetching and updating reading progress with debounced updates
 */

import { useState, useCallback, useEffect } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { useDebouncedCallback } from 'use-debounce'
import {
  getProgress,
  updateProgress,
  type ProgressData,
} from '@/lib/api/progress'

/**
 * Query keys for progress-related queries
 */
export const progressKeys = {
  all: ['reading-progress'] as const,
  detail: (fileId: string) => [...progressKeys.all, fileId] as const,
}

/**
 * Hook to manage reading progress for a file
 */
export function useReadingProgress(
  fileId: string | undefined,
  options?: Omit<UseQueryOptions<ProgressData, Error>, 'queryKey' | 'queryFn'>
) {
  const queryClient = useQueryClient()
  const [localPage, setLocalPage] = useState<number | null>(null)

  // Query for initial progress
  const query = useQuery<ProgressData, Error>({
    queryKey: fileId ? progressKeys.detail(fileId) : [],
    queryFn: () => {
      if (!fileId) {
        throw new Error('File ID is required')
      }
      return getProgress(fileId)
    },
    enabled: !!fileId,
    staleTime: 30000, // 30 seconds
    ...options,
  })

  // Mutation for updating progress
  const updateProgressMutation = useMutation<
    ProgressData,
    Error,
    { fileId: string; page: number }
  >({
    mutationFn: ({ fileId, page }) => updateProgress(fileId, page),
    onSuccess: (data, { fileId }) => {
      // Update cache with server response
      queryClient.setQueryData(progressKeys.detail(fileId), data)
    },
  })

  // Debounced update function (300ms)
  const debouncedUpdate = useDebouncedCallback(async (page: number) => {
    if (fileId) {
      try {
        await updateProgressMutation.mutateAsync({ fileId, page })
      } catch (error) {
        // Error is handled by React Query mutation state
        // This catch prevents unhandled promise rejection
        console.error('Failed to update reading progress:', error)
      }
    }
  }, 300)

  // Combined page (local state for immediate UI, server state as backup)
  const currentPage = localPage ?? query.data?.currentPage ?? 1

  // Update function that sets local state immediately and debounces server update
  const setPage = useCallback(
    (page: number) => {
      setLocalPage(page)
      debouncedUpdate(page)
    },
    [debouncedUpdate]
  )

  // Reset local state when fileId changes and cancel pending updates
  useEffect(() => {
    setLocalPage(null)
    return () => {
      debouncedUpdate.cancel()
    }
  }, [fileId, debouncedUpdate])

  return {
    currentPage,
    setPage,
    isLoading: query.isLoading,
    isSaving: updateProgressMutation.isPending,
    error: query.error,
  }
}
