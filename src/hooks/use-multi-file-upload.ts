/**
 * Multi-file upload hook with concurrent upload management
 *
 * Features:
 * - Validates files (PDF only, max 200MB)
 * - Manages upload queue with max 3 concurrent uploads
 * - Automatic retry (max 3 attempts)
 * - Progress tracking
 * - Cancel/retry/remove functionality
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { STORAGE } from '@/lib/constants'
import { sanitizeFileName } from '@/lib/sanitize'

export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'

export interface UploadItem {
  id: string
  file: File
  status: UploadStatus
  progress: number
  retries: number
  error?: string
  fileId?: string // Database file ID after upload
}

export interface UploadStats {
  total: number
  pending: number
  uploading: number
  processing: number
  completed: number
  failed: number
}

const MAX_CONCURRENT_UPLOADS = 3
const MAX_RETRY_ATTEMPTS = 3

/**
 * Hook for managing multi-file uploads with queue management
 */
export function useMultiFileUpload(
  courseId: string,
  csrfToken: string,
  currentFileCount = 0
) {
  const [queue, setQueue] = useState<UploadItem[]>([])
  const abortControllers = useRef<Map<string, AbortController>>(new Map())

  // Calculate stats (MEDIUM-1: Wrapped in useMemo for efficiency)
  const stats: UploadStats = useMemo(() => ({
    total: queue.length,
    pending: queue.filter((item) => item.status === 'pending').length,
    uploading: queue.filter((item) => item.status === 'uploading').length,
    processing: queue.filter((item) => item.status === 'processing').length,
    completed: queue.filter((item) => item.status === 'completed').length,
    failed: queue.filter((item) => item.status === 'failed').length,
  }), [queue])

  /**
   * Validate a file before adding to queue
   */
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string; sanitizedName?: string } => {
      // MAJOR-3: Sanitize file name
      const sanitizedName = sanitizeFileName(file.name)

      // Check file type
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) {
        return { valid: false, error: 'Only PDF files are allowed' }
      }

      // Check file size
      if (file.size > STORAGE.MAX_FILE_SIZE) {
        return {
          valid: false,
          error: 'File size exceeds the 200 MB limit',
        }
      }

      // MEDIUM-4: Check course file limit including pending queue items
      const pendingUploads = queue.filter(
        (item) => item.status === 'pending' || item.status === 'uploading'
      ).length
      const totalFiles = currentFileCount + pendingUploads

      if (totalFiles >= STORAGE.MAX_FILES_PER_COURSE) {
        return {
          valid: false,
          error: `Cannot exceed maximum of ${STORAGE.MAX_FILES_PER_COURSE} files per course`,
        }
      }

      return { valid: true, sanitizedName }
    },
    [currentFileCount, queue]
  )

  /**
   * Add files to upload queue
   */
  const addFiles = useCallback(
    (files: File[]) => {
      const newItems: UploadItem[] = files.map((file) => {
        const validation = validateFile(file)
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        if (!validation.valid) {
          return {
            id,
            file,
            status: 'failed' as const,
            progress: 0,
            retries: 0,
            error: validation.error,
          }
        }

        // Use sanitized file name if available
        const fileToUse = validation.sanitizedName && validation.sanitizedName !== file.name
          ? new File([file], validation.sanitizedName, { type: file.type })
          : file

        return {
          id,
          file: fileToUse,
          status: 'pending' as const,
          progress: 0,
          retries: 0,
        }
      })

      setQueue((prev) => [...prev, ...newItems])
    },
    [validateFile]
  )

  /**
   * Upload a single file
   */
  const uploadFile = useCallback(
    async (item: UploadItem) => {
      const controller = new AbortController()
      abortControllers.current.set(item.id, controller)

      try {
        // Update status to uploading
        setQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading' as const } : i))
        )

        // Step 1: Get signed upload URL
        const uploadUrlResponse = await fetch('/api/files/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken, // CRITICAL-2: Fixed header casing
          },
          body: JSON.stringify({
            courseId,
            fileName: item.file.name,
            fileSize: item.file.size,
          }),
          signal: controller.signal,
        })

        if (!uploadUrlResponse.ok) {
          const errorData = await uploadUrlResponse.json()
          throw new Error(errorData.error?.message || 'Failed to get upload URL')
        }

        const uploadUrlData = await uploadUrlResponse.json()
        const { fileId, uploadUrl, token } = uploadUrlData.data

        // Step 2: Upload to R2
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100)
              setQueue((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, progress } : i))
              )
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          })

          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'))
          })

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'))
          })

          // MEDIUM-2: Add abort listener before sending
          controller.signal.addEventListener('abort', () => {
            xhr.abort()
          })

          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('X-Custom-Auth-Key', token)
          xhr.send(item.file)
        })

        // Step 3: Confirm upload and trigger processing
        const confirmResponse = await fetch('/api/files/confirm', { // CRITICAL-1: Fixed endpoint
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken, // CRITICAL-2: Fixed header casing
          },
          body: JSON.stringify({ fileId }),
          signal: controller.signal,
        })

        if (!confirmResponse.ok) {
          throw new Error('Failed to confirm upload')
        }

        const confirmData = await confirmResponse.json()

        // MAJOR-2: Use actual API response status instead of hardcoded delay
        // Default to 'completed' if no status provided (for immediate completion)
        // Use 'processing' if explicitly set (for async processing workflows)
        const finalStatus = confirmData.data?.status === 'processing' ? 'processing' : 'completed'

        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: finalStatus, progress: 100, fileId }
              : i
          )
        )
      } catch (error: any) {
        const errorMessage =
          error.name === 'AbortError'
            ? 'Upload cancelled'
            : error.message || 'Upload failed'

        // MEDIUM-3: Add error logging
        console.error(`Upload failed for ${item.file.name}:`, error)

        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'failed' as const,
                  error: errorMessage,
                  retries: i.retries + 1,
                }
              : i
          )
        )

        // Auto-retry if under limit
        if (item.retries < MAX_RETRY_ATTEMPTS && error.name !== 'AbortError') {
          setTimeout(() => {
            // MAJOR-1: Update state to 'pending' before triggering retry to avoid race condition
            setQueue((prev) => {
              const failedItem = prev.find((i) => i.id === item.id)
              if (failedItem && failedItem.retries < MAX_RETRY_ATTEMPTS) {
                // Update to pending status first
                const updatedQueue = prev.map((i) =>
                  i.id === item.id
                    ? { ...i, status: 'pending' as const, error: undefined }
                    : i
                )
                // Trigger upload in next tick
                setTimeout(() => {
                  const itemToRetry = updatedQueue.find((i) => i.id === item.id)
                  if (itemToRetry) {
                    uploadFile(itemToRetry)
                  }
                }, 0)
                return updatedQueue
              }
              return prev
            })
          }, 1000 * Math.pow(2, item.retries)) // Exponential backoff
        }
      } finally {
        abortControllers.current.delete(item.id)
      }
    },
    [courseId, csrfToken]
  )

  /**
   * Process upload queue with concurrency limit
   */
  useEffect(() => {
    const uploadingCount = queue.filter((item) => item.status === 'uploading').length
    const pendingItems = queue.filter((item) => item.status === 'pending')

    // Start new uploads up to concurrent limit
    const slotsAvailable = MAX_CONCURRENT_UPLOADS - uploadingCount
    if (slotsAvailable > 0 && pendingItems.length > 0) {
      const itemsToStart = pendingItems.slice(0, slotsAvailable)

      // Use setTimeout to ensure state is visible before upload starts
      const timeoutId = setTimeout(() => {
        itemsToStart.forEach((item) => {
          uploadFile(item)
        })
      }, 0)

      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue])

  /**
   * CRITICAL-3: Cleanup AbortControllers on unmount to prevent memory leak
   */
  useEffect(() => {
    return () => {
      // Abort all active uploads
      abortControllers.current.forEach((controller) => controller.abort())
      abortControllers.current.clear()
    }
  }, [])

  /**
   * Cancel an upload
   */
  const cancel = useCallback((itemId: string) => {
    const controller = abortControllers.current.get(itemId)
    if (controller) {
      controller.abort()
    }

    setQueue((prev) => {
      const item = prev.find((i) => i.id === itemId)
      if (item?.status === 'pending') {
        // Remove pending items
        return prev.filter((i) => i.id !== itemId)
      }
      // Mark uploading items as failed
      return prev.map((i) =>
        i.id === itemId
          ? { ...i, status: 'failed' as const, error: 'Upload cancelled' }
          : i
      )
    })
  }, [])

  /**
   * Retry a failed upload
   */
  const retry = useCallback((itemId: string) => {
    setQueue((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              status: 'pending' as const,
              progress: 0,
              retries: 0,
              error: undefined,
            }
          : i
      )
    )
  }, [])

  /**
   * Remove an item from queue
   */
  const remove = useCallback((itemId: string) => {
    setQueue((prev) => prev.filter((i) => i.id !== itemId))
  }, [])

  /**
   * Clear all items from queue
   */
  const clearAll = useCallback(() => {
    // Cancel all active uploads
    abortControllers.current.forEach((controller) => controller.abort())
    abortControllers.current.clear()

    setQueue([])
  }, [])

  return {
    queue,
    stats,
    addFiles,
    cancel,
    retry,
    remove,
    clearAll,
  }
}
