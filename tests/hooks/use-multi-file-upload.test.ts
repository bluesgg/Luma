import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMultiFileUpload } from '@/hooks/use-multi-file-upload'
import { STORAGE } from '@/lib/constants'

// Mock fetch globally
global.fetch = vi.fn()

describe('useMultiFileUpload', () => {
  const mockCourseId = '123e4567-e89b-12d3-a456-426614174000'
  const mockCsrfToken = 'mock-csrf-token'

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    ;(global.fetch as any).mockReset()
  })

  // ============================================
  // TEST 1: Adding Files to Queue
  // ============================================
  describe('addFiles', () => {
    it('adds single file to queue with pending status', () => {
      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      expect(result.current.queue).toHaveLength(1)
      expect(result.current.queue[0]).toMatchObject({
        file,
        status: 'pending',
        progress: 0,
        retries: 0,
      })
      expect(result.current.queue[0].id).toBeDefined()
    })

    it('adds multiple files to queue', () => {
      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const files = [
        new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'test2.pdf', { type: 'application/pdf' }),
        new File(['content3'], 'test3.pdf', { type: 'application/pdf' }),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      expect(result.current.queue).toHaveLength(3)
      expect(result.current.queue[0].file.name).toBe('test1.pdf')
      expect(result.current.queue[1].file.name).toBe('test2.pdf')
      expect(result.current.queue[2].file.name).toBe('test3.pdf')
    })

    it('rejects non-PDF files with error', () => {
      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })

      act(() => {
        result.current.addFiles([file])
      })

      expect(result.current.queue).toHaveLength(1)
      expect(result.current.queue[0].status).toBe('failed')
      expect(result.current.queue[0].error).toContain('PDF')
    })

    it('rejects files larger than 200MB', () => {
      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      // Create a mock file with size > 200MB
      const largeFile = new File(['x'], 'large.pdf', { type: 'application/pdf' })
      Object.defineProperty(largeFile, 'size', {
        value: STORAGE.MAX_FILE_SIZE + 1,
        writable: false,
      })

      act(() => {
        result.current.addFiles([largeFile])
      })

      expect(result.current.queue).toHaveLength(1)
      expect(result.current.queue[0].status).toBe('failed')
      expect(result.current.queue[0].error).toContain('200 MB')
    })

    it('rejects files when at course limit (30 files)', () => {
      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken, STORAGE.MAX_FILES_PER_COURSE)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      expect(result.current.queue).toHaveLength(1)
      expect(result.current.queue[0].status).toBe('failed')
      expect(result.current.queue[0].error).toContain('maximum')
    })

    it('assigns unique IDs to each file', () => {
      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const files = [
        new File(['c1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['c2'], 'test2.pdf', { type: 'application/pdf' }),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      const ids = result.current.queue.map((item) => item.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(2)
    })
  })

  // ============================================
  // TEST 2: Concurrent Upload Limit (Max 3)
  // ============================================
  describe('concurrent upload limit', () => {
    it('uploads maximum 3 files concurrently', async () => {
      // Mock successful API responses
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              fileId: 'file-1',
              uploadUrl: 'https://upload.url/1',
              token: 'token-1',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              fileId: 'file-2',
              uploadUrl: 'https://upload.url/2',
              token: 'token-2',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              fileId: 'file-3',
              uploadUrl: 'https://upload.url/3',
              token: 'token-3',
            },
          }),
        })

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const files = [
        new File(['c1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['c2'], 'test2.pdf', { type: 'application/pdf' }),
        new File(['c3'], 'test3.pdf', { type: 'application/pdf' }),
        new File(['c4'], 'test4.pdf', { type: 'application/pdf' }),
        new File(['c5'], 'test5.pdf', { type: 'application/pdf' }),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      await waitFor(() => {
        const uploadingCount = result.current.queue.filter(
          (item) => item.status === 'uploading'
        ).length
        expect(uploadingCount).toBeLessThanOrEqual(3)
      })
    })

    it('starts next upload when one completes', async () => {
      let resolveUpload1: any
      let resolveUpload2: any
      let resolveUpload3: any

      // Create promises we can control
      const upload1Promise = new Promise((resolve) => {
        resolveUpload1 = resolve
      })
      const upload2Promise = new Promise((resolve) => {
        resolveUpload2 = resolve
      })
      const upload3Promise = new Promise((resolve) => {
        resolveUpload3 = resolve
      })

      // Mock upload URL requests
      ;(global.fetch as any)
        .mockReturnValueOnce(
          upload1Promise.then(() => ({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                fileId: 'file-1',
                uploadUrl: 'https://upload.url/1',
                token: 'token-1',
              },
            }),
          }))
        )
        .mockReturnValueOnce(
          upload2Promise.then(() => ({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                fileId: 'file-2',
                uploadUrl: 'https://upload.url/2',
                token: 'token-2',
              },
            }),
          }))
        )
        .mockReturnValueOnce(
          upload3Promise.then(() => ({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                fileId: 'file-3',
                uploadUrl: 'https://upload.url/3',
                token: 'token-3',
              },
            }),
          }))
        )

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const files = [
        new File(['c1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['c2'], 'test2.pdf', { type: 'application/pdf' }),
        new File(['c3'], 'test3.pdf', { type: 'application/pdf' }),
        new File(['c4'], 'test4.pdf', { type: 'application/pdf' }),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      // Wait for first 3 to start
      await waitFor(() => {
        const uploadingCount = result.current.queue.filter(
          (item) => item.status === 'uploading'
        ).length
        expect(uploadingCount).toBe(3)
      })

      // 4th file should still be pending
      expect(
        result.current.queue.find((item) => item.file.name === 'test4.pdf')?.status
      ).toBe('pending')

      // Complete first upload
      act(() => {
        resolveUpload1()
      })

      // 4th file should now start uploading
      await waitFor(() => {
        expect(
          result.current.queue.find((item) => item.file.name === 'test4.pdf')?.status
        ).toBe('uploading')
      })
    })
  })

  // ============================================
  // TEST 3: Progress Tracking
  // ============================================
  describe('progress tracking', () => {
    it('updates progress during upload', async () => {
      let progressCallback: ((event: ProgressEvent) => void) | null = null

      // Mock XMLHttpRequest for progress events
      const mockXHR = {
        upload: {
          addEventListener: vi.fn((event, callback) => {
            if (event === 'progress') {
              progressCallback = callback as any
            }
          }),
        },
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(() => {
          // Simulate progress
          setTimeout(() => {
            progressCallback?.(new ProgressEvent('progress', { loaded: 50, total: 100 }))
          }, 10)
          setTimeout(() => {
            mockXHR.onload?.({} as any)
          }, 20)
        }),
        onload: null as any,
        onerror: null as any,
      }

      global.XMLHttpRequest = vi.fn(() => mockXHR) as any

      // Mock upload URL response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            fileId: 'file-1',
            uploadUrl: 'https://upload.url/1',
            token: 'token-1',
          },
        }),
      })

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      await waitFor(() => {
        const uploadingFile = result.current.queue[0]
        expect(uploadingFile.progress).toBeGreaterThan(0)
      })
    })

    it('sets progress to 100 on completion', async () => {
      // Mock successful upload
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            fileId: 'file-1',
            uploadUrl: 'https://upload.url/1',
            token: 'token-1',
          },
        }),
      })

      // Mock R2 upload
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
      })

      // Mock confirm upload
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      await waitFor(
        () => {
          expect(result.current.queue[0].status).toBe('completed')
          expect(result.current.queue[0].progress).toBe(100)
        },
        { timeout: 3000 }
      )
    })

    it('provides overall progress statistics', async () => {
      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const files = [
        new File(['c1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['c2'], 'test2.pdf', { type: 'application/pdf' }),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      expect(result.current.stats.total).toBe(2)
      expect(result.current.stats.pending).toBe(2)
      expect(result.current.stats.uploading).toBe(0)
      expect(result.current.stats.completed).toBe(0)
      expect(result.current.stats.failed).toBe(0)
    })
  })

  // ============================================
  // TEST 4: Retry Mechanism (Max 3 Attempts)
  // ============================================
  describe('retry mechanism', () => {
    it('retries failed upload automatically', async () => {
      // First attempt fails, second succeeds
      ;(global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              fileId: 'file-1',
              uploadUrl: 'https://upload.url/1',
              token: 'token-1',
            },
          }),
        })

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      await waitFor(() => {
        expect(result.current.queue[0].retries).toBeGreaterThan(0)
      })
    })

    it('stops retrying after 3 attempts', async () => {
      // All 3 attempts fail
      ;(global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      await waitFor(
        () => {
          expect(result.current.queue[0].status).toBe('failed')
          expect(result.current.queue[0].retries).toBe(3)
        },
        { timeout: 5000 }
      )
    })

    it('allows manual retry after failure', async () => {
      // First attempt fails
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      await waitFor(() => {
        expect(result.current.queue[0].status).toBe('failed')
      })

      const fileId = result.current.queue[0].id

      // Mock successful retry
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            fileId: 'file-1',
            uploadUrl: 'https://upload.url/1',
            token: 'token-1',
          },
        }),
      })

      act(() => {
        result.current.retry(fileId)
      })

      await waitFor(() => {
        expect(result.current.queue[0].status).toBe('uploading')
      })
    })

    it('resets retry count on manual retry', async () => {
      // Fail 3 times
      ;(global.fetch as any)
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      await waitFor(() => {
        expect(result.current.queue[0].retries).toBe(3)
      })

      const fileId = result.current.queue[0].id

      // Manual retry should reset count
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { fileId: 'file-1', uploadUrl: 'https://upload.url/1', token: 'token-1' },
        }),
      })

      act(() => {
        result.current.retry(fileId)
      })

      expect(result.current.queue[0].retries).toBe(0)
    })
  })

  // ============================================
  // TEST 5: Cancel Functionality
  // ============================================
  describe('cancel functionality', () => {
    it('cancels uploading file', async () => {
      let abortController: AbortController | null = null

      // Mock fetch to capture abort controller
      ;(global.fetch as any).mockImplementation((_url: string, options: any) => {
        if (options?.signal) {
          abortController = { signal: options.signal } as AbortController
        }
        return new Promise(() => {}) // Never resolve
      })

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      await waitFor(() => {
        expect(result.current.queue[0].status).toBe('uploading')
      })

      const fileId = result.current.queue[0].id

      act(() => {
        result.current.cancel(fileId)
      })

      expect(result.current.queue[0].status).toBe('failed')
      expect(result.current.queue[0].error).toContain('cancel')
    })

    it('removes pending file from queue when cancelled', () => {
      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      const fileId = result.current.queue[0].id

      act(() => {
        result.current.cancel(fileId)
      })

      expect(result.current.queue).toHaveLength(0)
    })

    it('does not affect other uploads when cancelling one', async () => {
      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const files = [
        new File(['c1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['c2'], 'test2.pdf', { type: 'application/pdf' }),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      const firstFileId = result.current.queue[0].id

      act(() => {
        result.current.cancel(firstFileId)
      })

      expect(result.current.queue).toHaveLength(1)
      expect(result.current.queue[0].file.name).toBe('test2.pdf')
    })
  })

  // ============================================
  // TEST 6: Queue Cleanup
  // ============================================
  describe('queue cleanup', () => {
    it('removes completed file from queue', async () => {
      // Mock successful upload
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { fileId: 'file-1', uploadUrl: 'https://upload.url/1', token: 'token-1' },
          }),
        })
        .mockResolvedValueOnce({ ok: true }) // R2 upload
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        }) // Confirm upload

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      await waitFor(() => {
        expect(result.current.queue[0].status).toBe('completed')
      })

      const fileId = result.current.queue[0].id

      act(() => {
        result.current.remove(fileId)
      })

      expect(result.current.queue).toHaveLength(0)
    })

    it('removes failed file from queue', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      await waitFor(() => {
        expect(result.current.queue[0].status).toBe('failed')
      })

      const fileId = result.current.queue[0].id

      act(() => {
        result.current.remove(fileId)
      })

      expect(result.current.queue).toHaveLength(0)
    })

    it('clears all files from queue', () => {
      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const files = [
        new File(['c1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['c2'], 'test2.pdf', { type: 'application/pdf' }),
        new File(['c3'], 'test3.pdf', { type: 'application/pdf' }),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      expect(result.current.queue).toHaveLength(3)

      act(() => {
        result.current.clearAll()
      })

      expect(result.current.queue).toHaveLength(0)
    })
  })

  // ============================================
  // TEST 7: Error Handling
  // ============================================
  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      await waitFor(() => {
        expect(result.current.queue[0].status).toBe('failed')
        expect(result.current.queue[0].error).toBeDefined()
      })
    })

    it('handles API error responses', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds limit',
          },
        }),
      })

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      await waitFor(() => {
        expect(result.current.queue[0].status).toBe('failed')
        expect(result.current.queue[0].error).toContain('File size exceeds limit')
      })
    })

    it('handles duplicate file name error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          error: {
            code: 'FILE_NAME_EXISTS',
            message: 'File name already exists',
          },
        }),
      })

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'duplicate.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      await waitFor(() => {
        expect(result.current.queue[0].status).toBe('failed')
        expect(result.current.queue[0].error).toContain('already exists')
      })
    })

    it('handles storage limit exceeded error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: {
            code: 'FILE_STORAGE_EXCEEDED',
            message: 'Storage limit exceeded',
          },
        }),
      })

      const { result } = renderHook(() =>
        useMultiFileUpload(mockCourseId, mockCsrfToken)
      )

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([file])
      })

      await waitFor(() => {
        expect(result.current.queue[0].status).toBe('failed')
        expect(result.current.queue[0].error).toContain('Storage limit exceeded')
      })
    })
  })
})
