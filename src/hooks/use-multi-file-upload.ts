/**
 * FILE-014: React Hook for Multi-File Upload
 *
 * This hook provides functionality for:
 * - Uploading multiple files concurrently
 * - Tracking upload progress for each file
 * - Managing upload queue with concurrency control
 * - Canceling and retrying failed uploads
 * - Validating files before upload
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  requestUploadUrl,
  uploadToStorage,
  confirmUpload,
  type FileData,
} from '@/lib/api/files'
import { FILE_LIMITS } from '@/lib/constants'
import { fileKeys } from './use-files'
import { useToast } from './use-toast'

/**
 * Upload status for individual files
 */
export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error'

/**
 * Upload item representing a single file in the queue
 */
export interface UploadItem {
  id: string
  file: File
  progress: number
  status: UploadStatus
  error?: string
  fileId?: string
  fileData?: FileData
}

/**
 * Validation error
 */
export interface ValidationError {
  file: File
  error: string
}

/**
 * Options for the multi-file upload hook
 */
export interface UseMultiFileUploadOptions {
  courseId: string
  maxConcurrent?: number
  onUploadComplete?: (fileData: FileData) => void
  onAllComplete?: () => void
}

/**
 * Validate a single file before upload
 */
function validateFile(file: File): string | null {
  // Check file type
  if (file.type !== 'application/pdf') {
    return 'Only PDF files are allowed'
  }

  // Check file size
  if (file.size > FILE_LIMITS.MAX_FILE_SIZE) {
    const maxSizeMB = FILE_LIMITS.MAX_FILE_SIZE / 1024 / 1024
    return `File size exceeds maximum allowed size of ${maxSizeMB}MB`
  }

  // Check file name length
  if (file.name.length > 255) {
    return 'File name is too long (maximum 255 characters)'
  }

  return null
}

/**
 * Hook for multi-file upload with concurrent upload support
 * Includes cleanup on unmount to prevent memory leaks
 */
export function useMultiFileUpload(options: UseMultiFileUploadOptions) {
  const { courseId, maxConcurrent = FILE_LIMITS.MAX_CONCURRENT_UPLOADS } =
    options
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const uploadQueueRef = useRef<string[]>([])
  const activeUploadsRef = useRef<Set<string>>(new Set())
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  // Cleanup on unmount to prevent memory leaks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    return () => {
      // Abort all active uploads
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const abortControllers = abortControllersRef.current
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const activeUploads = activeUploadsRef.current

      abortControllers.forEach((controller) => {
        controller.abort()
      })

      // Clear all refs
      abortControllers.clear()
      activeUploads.clear()
      uploadQueueRef.current = []
    }
  }, [])

  /**
   * Generate a unique ID for an upload item
   */
  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  /**
   * Add files to the upload queue
   */
  const addFiles = useCallback(
    (files: File[]) => {
      const validationErrors: ValidationError[] = []
      const newItems: UploadItem[] = []

      files.forEach((file) => {
        const error = validateFile(file)
        if (error) {
          validationErrors.push({ file, error })
        } else {
          newItems.push({
            id: generateId(),
            file,
            progress: 0,
            status: 'pending',
          })
        }
      })

      // Show validation errors
      if (validationErrors.length > 0) {
        validationErrors.forEach(({ file, error }) => {
          toast({
            variant: 'destructive',
            title: `Invalid file: ${file.name}`,
            description: error,
          })
        })
      }

      // Add valid files to the queue
      if (newItems.length > 0) {
        setUploadItems((prev) => [...prev, ...newItems])
        uploadQueueRef.current.push(...newItems.map((item) => item.id))
      }

      return newItems.map((item) => item.id)
    },
    [toast]
  )

  /**
   * Upload a single file
   */
  const uploadFile = useCallback(
    async (item: UploadItem) => {
      const abortController = new AbortController()
      abortControllersRef.current.set(item.id, abortController)

      try {
        // Update status to uploading
        setUploadItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i
          )
        )

        // Step 1: Request upload URL
        const uploadUrlData = await requestUploadUrl({
          fileName: item.file.name,
          fileSize: item.file.size,
          fileType: item.file.type,
          courseId,
        })

        // Update progress: 10%
        setUploadItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, progress: 10, fileId: uploadUrlData.fileId }
              : i
          )
        )

        // Step 2: Upload file to storage
        await uploadToStorage(uploadUrlData.uploadUrl, item.file)

        // Update progress: 80%
        setUploadItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, progress: 80 } : i))
        )

        // Step 3: Confirm upload
        const fileData = await confirmUpload({
          fileId: uploadUrlData.fileId,
        })

        // Update status to success
        setUploadItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'success', progress: 100, fileData }
              : i
          )
        )

        // Call completion callback
        options.onUploadComplete?.(fileData)

        return fileData
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed'

        setUploadItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'error', error: errorMessage }
              : i
          )
        )

        toast({
          variant: 'destructive',
          title: `Upload failed: ${item.file.name}`,
          description: errorMessage,
        })

        throw error
      } finally {
        abortControllersRef.current.delete(item.id)
        activeUploadsRef.current.delete(item.id)
      }
    },
    [courseId, toast, options]
  )

  /**
   * Process the upload queue
   */
  const processQueue = useCallback(async () => {
    while (uploadQueueRef.current.length > 0) {
      // Wait if we've reached max concurrent uploads
      while (activeUploadsRef.current.size >= maxConcurrent) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      const itemId = uploadQueueRef.current.shift()
      if (!itemId) break

      const item = uploadItems.find((i) => i.id === itemId)
      if (!item) continue

      activeUploadsRef.current.add(itemId)

      // Upload file without blocking
      uploadFile(item).finally(() => {
        // Check if all uploads are complete
        if (
          uploadQueueRef.current.length === 0 &&
          activeUploadsRef.current.size === 0
        ) {
          setIsUploading(false)
          queryClient.invalidateQueries({
            queryKey: fileKeys.list(courseId),
          })
          options.onAllComplete?.()
        }
      })
    }
  }, [uploadItems, maxConcurrent, uploadFile, queryClient, courseId, options])

  /**
   * Start uploading all pending files
   */
  const startUpload = useCallback(() => {
    if (uploadItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No files to upload',
        description: 'Please add files before starting upload.',
      })
      return
    }

    setIsUploading(true)
    processQueue()
  }, [uploadItems, toast, processQueue])

  /**
   * Cancel a specific upload
   */
  const cancelUpload = useCallback((itemId: string) => {
    const abortController = abortControllersRef.current.get(itemId)
    if (abortController) {
      abortController.abort()
      abortControllersRef.current.delete(itemId)
    }

    // Remove from queue
    uploadQueueRef.current = uploadQueueRef.current.filter(
      (id) => id !== itemId
    )
    activeUploadsRef.current.delete(itemId)

    // Remove from items
    setUploadItems((prev) => prev.filter((item) => item.id !== itemId))
  }, [])

  /**
   * Retry a failed upload
   */
  const retryUpload = useCallback(
    (itemId: string) => {
      const item = uploadItems.find((i) => i.id === itemId)
      if (!item || item.status !== 'error') return

      // Reset item status
      setUploadItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, status: 'pending', progress: 0, error: undefined }
            : i
        )
      )

      // Add back to queue
      uploadQueueRef.current.push(itemId)

      // Start processing if not already uploading
      if (!isUploading) {
        setIsUploading(true)
        processQueue()
      }
    },
    [uploadItems, isUploading, processQueue]
  )

  /**
   * Clear completed uploads
   */
  const clearCompleted = useCallback(() => {
    setUploadItems((prev) => prev.filter((item) => item.status !== 'success'))
  }, [])

  /**
   * Clear all uploads
   */
  const clearAll = useCallback(() => {
    // Cancel all active uploads
    abortControllersRef.current.forEach((controller) => controller.abort())
    abortControllersRef.current.clear()

    // Clear queue and state
    uploadQueueRef.current = []
    activeUploadsRef.current.clear()
    setUploadItems([])
    setIsUploading(false)
  }, [])

  /**
   * Get upload statistics
   */
  const stats = {
    total: uploadItems.length,
    pending: uploadItems.filter((item) => item.status === 'pending').length,
    uploading: uploadItems.filter((item) => item.status === 'uploading').length,
    success: uploadItems.filter((item) => item.status === 'success').length,
    error: uploadItems.filter((item) => item.status === 'error').length,
  }

  return {
    uploadItems,
    isUploading,
    stats,
    addFiles,
    startUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
    clearAll,
  }
}
