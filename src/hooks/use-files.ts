'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCsrf } from './use-csrf'
import {
  fetchCourseFiles,
  requestUploadUrl,
  confirmUpload,
  deleteFile,
  type FileResponse,
  type FilesWithCourse,
  type UploadUrlResponse,
  type ConfirmUploadOptions,
} from '@/lib/api/files'
import { STORAGE } from '@/lib/constants'

export const FILES_QUERY_KEY = ['files'] as const

const CSRF_HEADER_NAME = 'X-CSRF-Token'
const MAX_CSRF_RETRIES = 3
const CSRF_RETRY_DELAY = 100 // ms

/**
 * Wait for CSRF token with retry mechanism
 */
async function waitForCsrfToken(
  getHeaders: () => Record<string, string>,
  refreshToken: () => Promise<void>,
  retryCount = 0
): Promise<Record<string, string>> {
  const headers = getHeaders()

  if (headers[CSRF_HEADER_NAME]) {
    return headers
  }

  if (retryCount >= MAX_CSRF_RETRIES) {
    throw new Error('CSRF token not available after multiple attempts. Please refresh the page.')
  }

  // Try refreshing the token
  await refreshToken()

  // Wait a bit for state to update
  await new Promise((resolve) => setTimeout(resolve, CSRF_RETRY_DELAY))

  // Retry with incremented count
  return waitForCsrfToken(getHeaders, refreshToken, retryCount + 1)
}

/**
 * Hook for fetching files for a course
 */
export function useFiles(courseId: string) {
  const query = useQuery({
    queryKey: [...FILES_QUERY_KEY, courseId],
    queryFn: () => fetchCourseFiles(courseId),
    enabled: Boolean(courseId),
  })

  return {
    ...query,
    files: query.data?.files ?? [],
    course: query.data?.course,
    fileCount: query.data?.files?.length ?? 0,
    canUploadFile: (query.data?.files?.length ?? 0) < STORAGE.MAX_FILES_PER_COURSE,
  }
}

/**
 * Hook for uploading files
 */
export function useUploadFile(courseId: string) {
  const queryClient = useQueryClient()
  const { getHeaders, refreshToken } = useCsrf()

  const uploadMutation = useMutation({
    mutationFn: async ({
      fileName,
      fileSize,
    }: {
      fileName: string
      fileSize: number
    }) => {
      const headers = await waitForCsrfToken(getHeaders, refreshToken)
      return requestUploadUrl(courseId, fileName, fileSize, headers)
    },
  })

  const confirmMutation = useMutation({
    mutationFn: async ({
      fileId,
      options,
    }: {
      fileId: string
      options?: ConfirmUploadOptions
    }) => {
      const headers = await waitForCsrfToken(getHeaders, refreshToken)
      return confirmUpload(courseId, fileId, headers, options)
    },
    onSuccess: (newFile) => {
      queryClient.setQueryData<FilesWithCourse>(
        [...FILES_QUERY_KEY, courseId],
        (old) => {
          if (!old) return old
          return {
            ...old,
            files: [...old.files, newFile],
          }
        }
      )
    },
  })

  const requestUploadFn = async (
    fileName: string,
    fileSize: number
  ): Promise<UploadUrlResponse> => {
    return uploadMutation.mutateAsync({ fileName, fileSize })
  }

  const confirmUploadFn = async (
    fileId: string,
    options?: ConfirmUploadOptions
  ): Promise<FileResponse> => {
    return confirmMutation.mutateAsync({ fileId, options })
  }

  return {
    requestUpload: requestUploadFn,
    confirmUpload: confirmUploadFn,
    isLoading: uploadMutation.isPending || confirmMutation.isPending,
    error: uploadMutation.error || confirmMutation.error,
  }
}

/**
 * Hook for deleting files
 */
export function useDeleteFile(courseId: string) {
  const queryClient = useQueryClient()
  const { getHeaders, refreshToken } = useCsrf()

  return useMutation({
    mutationFn: async (fileId: string) => {
      const headers = await waitForCsrfToken(getHeaders, refreshToken)
      return deleteFile(courseId, fileId, headers)
    },
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [...FILES_QUERY_KEY, courseId] })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<FilesWithCourse>([
        ...FILES_QUERY_KEY,
        courseId,
      ])

      // Optimistically update
      queryClient.setQueryData<FilesWithCourse>(
        [...FILES_QUERY_KEY, courseId],
        (old) => {
          if (!old) return old
          return {
            ...old,
            files: old.files.filter((file) => file.id !== deletedId),
          }
        }
      )

      return { previousData }
    },
    onError: (_err, _deletedId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          [...FILES_QUERY_KEY, courseId],
          context.previousData
        )
      }
    },
  })
}
