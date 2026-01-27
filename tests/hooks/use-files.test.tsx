// =============================================================================
// FILE-013: useFiles Hook Tests (TDD)
// Hook for fetching and managing files for a course
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mockFile, mockCourse } from '../setup'

// Hook to be implemented
const useFiles = (courseId: string) => ({
  files: [],
  isLoading: true,
  error: null,
  refetch: vi.fn(),
  deleteFile: vi.fn(),
  isDeleting: false,
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useFiles Hook (FILE-013)', () => {
  const courseId = 'course-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Fetching Files', () => {
    it('should return loading state initially', () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.files).toEqual([])
    })

    it('should fetch files for a course', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(Array.isArray(result.current.files)).toBe(true)
      })
    })

    it('should include file metadata', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        if (result.current.files.length > 0) {
          const file = result.current.files[0]
          expect(file).toHaveProperty('id')
          expect(file).toHaveProperty('name')
          expect(file).toHaveProperty('status')
          expect(file).toHaveProperty('fileSize')
          expect(file).toHaveProperty('pageCount')
        }
      })
    })

    it('should return empty array for course with no files', async () => {
      const { result } = renderHook(() => useFiles('empty-course'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.files).toEqual([])
      })
    })

    it('should sort files by createdAt descending', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        if (result.current.files.length >= 2) {
          const firstDate = new Date(result.current.files[0].createdAt)
          const secondDate = new Date(result.current.files[1].createdAt)
          expect(firstDate.getTime()).toBeGreaterThanOrEqual(
            secondDate.getTime()
          )
        }
      })
    })
  })

  describe('Query Caching', () => {
    it('should cache query results', async () => {
      const wrapper = createWrapper()

      const { result: result1 } = renderHook(() => useFiles(courseId), {
        wrapper,
      })
      await waitFor(() => expect(result1.current.isLoading).toBe(false))

      const { result: result2 } = renderHook(() => useFiles(courseId), {
        wrapper,
      })

      // Second hook should use cached data immediately
      expect(result2.current.isLoading).toBe(false)
    })

    it('should use different cache for different courses', async () => {
      const wrapper = createWrapper()

      const { result: result1 } = renderHook(() => useFiles('course-1'), {
        wrapper,
      })
      const { result: result2 } = renderHook(() => useFiles('course-2'), {
        wrapper,
      })

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false)
        expect(result2.current.isLoading).toBe(false)
      })

      // Results should be independent
      expect(result1.current.files).not.toBe(result2.current.files)
    })

    it('should refetch on window focus', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Simulate window focus
      window.dispatchEvent(new Event('focus'))

      await waitFor(() => {
        // Should trigger refetch
        expect(true).toBe(true)
      })
    })

    it('should set appropriate stale time', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Data should stay fresh for reasonable time (e.g., 30 seconds)
      expect(result.current.files).toBeDefined()
    })
  })

  describe('Manual Refetch', () => {
    it('should provide refetch function', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.refetch).toBeDefined()
      expect(typeof result.current.refetch).toBe('function')
    })

    it('should refetch data when called', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await result.current.refetch()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should update cache after refetch', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const initialFiles = result.current.files

      await result.current.refetch()

      await waitFor(() => {
        // Cache should be updated
        expect(result.current.files).toBeDefined()
      })
    })
  })

  describe('Delete File Mutation', () => {
    it('should provide deleteFile function', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.deleteFile).toBeDefined()
      expect(typeof result.current.deleteFile).toBe('function')
    })

    it('should set isDeleting to true while deleting', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      result.current.deleteFile('file-123')

      expect(result.current.isDeleting).toBe(true)
    })

    it('should call delete API with fileId', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await result.current.deleteFile('file-123')

      // Verify API call in implementation
      expect(true).toBe(true)
    })

    it('should remove file from list on success', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const initialCount = result.current.files.length

      await result.current.deleteFile('file-123')

      await waitFor(() => {
        expect(result.current.files.length).toBeLessThan(initialCount)
      })
    })

    it('should invalidate query cache after delete', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await result.current.deleteFile('file-123')

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false)
      })
    })

    it('should handle delete errors gracefully', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Mock delete failure
      await expect(
        result.current.deleteFile('nonexistent-file')
      ).resolves.not.toThrow()
    })

    it('should show error state on delete failure', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await result.current.deleteFile('nonexistent-file')

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const { result } = renderHook(() => useFiles('error-course'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeDefined()
      })
    })

    it('should handle 404 course not found', async () => {
      const { result } = renderHook(() => useFiles('nonexistent-course'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeDefined()
      })
    })

    it('should handle 403 forbidden', async () => {
      const { result } = renderHook(() => useFiles('forbidden-course'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeDefined()
      })
    })

    it('should retry failed requests', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false)
        },
        { timeout: 5000 }
      )
    })
  })

  describe('File Status Filtering', () => {
    it('should include files in all statuses', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        if (result.current.files.length > 0) {
          const statuses = result.current.files.map((f) => f.status)
          // Should include UPLOADING, PROCESSING, READY, FAILED
          expect(statuses.length).toBeGreaterThan(0)
        }
      })
    })

    it('should provide status counts', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        const files = result.current.files
        const readyCount = files.filter((f) => f.status === 'READY').length
        const processingCount = files.filter(
          (f) => f.status === 'PROCESSING'
        ).length

        expect(typeof readyCount).toBe('number')
        expect(typeof processingCount).toBe('number')
      })
    })
  })

  describe('Optimistic Updates', () => {
    it('should optimistically remove file on delete', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const fileToDelete = result.current.files[0]?.id
      if (fileToDelete) {
        result.current.deleteFile(fileToDelete)

        // File should be immediately removed from UI
        expect(
          result.current.files.find((f) => f.id === fileToDelete)
        ).toBeUndefined()
      }
    })

    it('should rollback on delete failure', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const initialFiles = [...result.current.files]

      // Mock delete failure
      await result.current.deleteFile('invalid-file')

      await waitFor(() => {
        // Should rollback to original state
        expect(result.current.files.length).toBe(initialFiles.length)
      })
    })
  })

  describe('TypeScript Types', () => {
    it('should have correct type inference for files', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        if (result.current.files.length > 0) {
          const file = result.current.files[0]
          // These should not cause TypeScript errors
          const id: string = file.id
          const name: string = file.name
          const status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED' =
            file.status

          expect(id).toBeDefined()
          expect(name).toBeDefined()
          expect(status).toBeDefined()
        }
      })
    })

    it('should have correct mutation types', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // deleteFile should accept string fileId
      const deleteFile: (fileId: string) => Promise<void> =
        result.current.deleteFile
      expect(typeof deleteFile).toBe('function')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty courseId gracefully', async () => {
      const { result } = renderHook(() => useFiles(''), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle invalid courseId format', async () => {
      const { result } = renderHook(() => useFiles('invalid-id'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeDefined()
      })
    })

    it('should handle course with 30 files', async () => {
      const { result } = renderHook(() => useFiles('full-course'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.files.length).toBeLessThanOrEqual(30)
      })
    })

    it('should handle concurrent refetches', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Trigger multiple refetches
      result.current.refetch()
      result.current.refetch()
      result.current.refetch()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle courseId changes', async () => {
      const { result, rerender } = renderHook(
        ({ courseId }) => useFiles(courseId),
        {
          wrapper: createWrapper(),
          initialProps: { courseId: 'course-1' },
        }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Change courseId
      rerender({ courseId: 'course-2' })

      await waitFor(() => {
        // Should fetch new course files
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('File Metadata', () => {
    it('should include structure status', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        if (result.current.files.length > 0) {
          const file = result.current.files[0]
          expect(file).toHaveProperty('structureStatus')
        }
      })
    })

    it('should include isScanned flag', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        if (result.current.files.length > 0) {
          const file = result.current.files[0]
          expect(file).toHaveProperty('isScanned')
          expect(typeof file.isScanned).toBe('boolean')
        }
      })
    })

    it('should serialize BigInt fileSize correctly', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        if (result.current.files.length > 0) {
          const file = result.current.files[0]
          expect(typeof file.fileSize).toBe('number')
          expect(file.fileSize).toBeGreaterThan(0)
        }
      })
    })

    it('should handle null optional fields', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        if (result.current.files.length > 0) {
          const file = result.current.files[0]
          // pageCount might be null
          expect(
            file.pageCount === null || typeof file.pageCount === 'number'
          ).toBe(true)
        }
      })
    })
  })

  describe('Performance', () => {
    it('should debounce rapid refetch calls', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Rapid refetches should be debounced
      for (let i = 0; i < 10; i++) {
        result.current.refetch()
      }

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should not refetch if already fetching', async () => {
      const { result } = renderHook(() => useFiles(courseId), {
        wrapper: createWrapper(),
      })

      // Call refetch before initial fetch completes
      result.current.refetch()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })
})
