/**
 * FILE-013: React Hook for File Management
 *
 * This hook provides functionality for:
 * - Fetching files for a course
 * - Getting a single file
 * - Updating file metadata
 * - Deleting files
 * - Getting download URLs
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  getFiles,
  getFile,
  updateFile,
  deleteFile,
  getDownloadUrl,
  type FileData,
  type UpdateFileRequest,
} from '@/lib/api/files'
import { useToast } from './use-toast'

/**
 * Query keys for file-related queries
 */
export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (courseId: string) => [...fileKeys.lists(), courseId] as const,
  details: () => [...fileKeys.all, 'detail'] as const,
  detail: (fileId: string) => [...fileKeys.details(), fileId] as const,
}

/**
 * Hook to fetch all files for a course
 */
export function useFiles(
  courseId: string | undefined,
  options?: Omit<UseQueryOptions<FileData[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<FileData[], Error>({
    queryKey: courseId ? fileKeys.list(courseId) : [],
    queryFn: () => {
      if (!courseId) {
        throw new Error('Course ID is required')
      }
      return getFiles(courseId)
    },
    enabled: !!courseId,
    staleTime: 30000, // 30 seconds
    ...options,
  })
}

/**
 * Hook to fetch a single file
 */
export function useFile(
  fileId: string | undefined,
  options?: Omit<UseQueryOptions<FileData, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<FileData, Error>({
    queryKey: fileId ? fileKeys.detail(fileId) : [],
    queryFn: () => {
      if (!fileId) {
        throw new Error('File ID is required')
      }
      return getFile(fileId)
    },
    enabled: !!fileId,
    staleTime: 30000, // 30 seconds
    ...options,
  })
}

/**
 * Hook to update file metadata
 */
export function useUpdateFile() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<
    FileData,
    Error,
    { fileId: string; data: UpdateFileRequest }
  >({
    mutationFn: ({ fileId, data }) => updateFile(fileId, data),
    onSuccess: (updatedFile) => {
      // Invalidate and refetch file list
      queryClient.invalidateQueries({
        queryKey: fileKeys.list(updatedFile.courseId),
      })

      // Update the file detail cache
      queryClient.setQueryData(fileKeys.detail(updatedFile.id), updatedFile)

      toast({
        title: 'File updated',
        description: 'File has been updated successfully.',
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description:
          error.message || 'Failed to update file. Please try again.',
      })
    },
  })
}

/**
 * Hook to delete a file
 */
export function useDeleteFile() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<void, Error, { fileId: string; courseId: string }>({
    mutationFn: ({ fileId }) => deleteFile(fileId),
    onSuccess: (_, { courseId }) => {
      // Invalidate and refetch file list
      queryClient.invalidateQueries({
        queryKey: fileKeys.list(courseId),
      })

      toast({
        title: 'File deleted',
        description: 'File has been deleted successfully.',
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description:
          error.message || 'Failed to delete file. Please try again.',
      })
    },
  })
}

/**
 * Hook to get download URL for a file
 */
export function useDownloadUrl() {
  const { toast } = useToast()

  return useMutation<string, Error, string>({
    mutationFn: (fileId: string) => getDownloadUrl(fileId),
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description:
          error.message || 'Failed to get download URL. Please try again.',
      })
    },
  })
}

/**
 * Helper function to download a file
 */
export async function downloadFileFromUrl(url: string, fileName: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Download failed')
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  } catch {
    throw new Error('Failed to download file')
  }
}
