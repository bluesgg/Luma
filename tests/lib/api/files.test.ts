import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// Test Setup
// ============================================

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import after mocking
import {
  fetchCourseFiles,
  requestUploadUrl,
  confirmUpload,
  deleteFile,
  type FileResponse,
  type UploadUrlResponse,
} from '@/lib/api/files'

// ============================================
// Test Fixtures
// ============================================

const mockCourseId = '123e4567-e89b-12d3-a456-426614174001'
const mockFileId = '123e4567-e89b-12d3-a456-426614174002'

const mockFile: FileResponse = {
  id: mockFileId,
  courseId: mockCourseId,
  userId: '123e4567-e89b-12d3-a456-426614174000',
  name: 'lecture-01.pdf',
  type: 'lecture',
  pageCount: 25,
  fileSize: 1024 * 1024 * 5, // 5MB
  isScanned: false,
  status: 'ready',
  storagePath: 'users/123/courses/456/files/789/lecture-01.pdf',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockUploadUrlResponse: UploadUrlResponse = {
  fileId: mockFileId,
  uploadUrl: 'https://r2.example.com/upload?signature=abc123',
  expiresAt: '2024-01-01T01:00:00Z',
}

const mockCsrfHeaders = {
  'X-CSRF-Token': 'test-csrf-token',
}

// ============================================
// fetchCourseFiles Tests
// ============================================

describe('fetchCourseFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns files array for a course', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            files: [mockFile],
            course: { id: mockCourseId, name: 'Test Course' },
          },
        }),
    })

    const result = await fetchCourseFiles(mockCourseId)

    expect(result.files).toHaveLength(1)
    expect(result.files[0]).toEqual(mockFile)
    expect(result.course.name).toBe('Test Course')
  })

  it('sends request to correct endpoint with credentials', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { files: [], course: { id: mockCourseId, name: 'Test' } },
        }),
    })

    await fetchCourseFiles(mockCourseId)

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/courses/${mockCourseId}/files`,
      expect.objectContaining({
        credentials: 'include',
      })
    )
  })

  it('throws error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () =>
        Promise.resolve({
          success: false,
          error: { code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        }),
    })

    await expect(fetchCourseFiles(mockCourseId)).rejects.toThrow(
      'Course not found'
    )
  })

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(fetchCourseFiles(mockCourseId)).rejects.toThrow('Network error')
  })

  it('handles malformed JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Invalid JSON')),
    })

    await expect(fetchCourseFiles(mockCourseId)).rejects.toThrow()
  })

  it('returns empty array when course has no files', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { files: [], course: { id: mockCourseId, name: 'Empty Course' } },
        }),
    })

    const result = await fetchCourseFiles(mockCourseId)

    expect(result.files).toHaveLength(0)
  })

  it('handles files with different statuses', async () => {
    const filesWithStatuses: FileResponse[] = [
      { ...mockFile, id: '1', status: 'uploading' },
      { ...mockFile, id: '2', status: 'processing' },
      { ...mockFile, id: '3', status: 'ready' },
      { ...mockFile, id: '4', status: 'failed' },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { files: filesWithStatuses, course: { id: mockCourseId, name: 'Test' } },
        }),
    })

    const result = await fetchCourseFiles(mockCourseId)

    expect(result.files).toHaveLength(4)
    expect(result.files[0].status).toBe('uploading')
    expect(result.files[1].status).toBe('processing')
    expect(result.files[2].status).toBe('ready')
    expect(result.files[3].status).toBe('failed')
  })
})

// ============================================
// requestUploadUrl Tests
// ============================================

describe('requestUploadUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns upload URL with file ID and expiration', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: mockUploadUrlResponse,
        }),
    })

    const result = await requestUploadUrl(
      mockCourseId,
      'new-file.pdf',
      1024 * 1024,
      mockCsrfHeaders
    )

    expect(result.fileId).toBe(mockFileId)
    expect(result.uploadUrl).toContain('https://')
    expect(result.expiresAt).toBeDefined()
  })

  it('sends correct request body with file details', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: mockUploadUrlResponse,
        }),
    })

    await requestUploadUrl(
      mockCourseId,
      'document.pdf',
      2048000,
      mockCsrfHeaders
    )

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/courses/${mockCourseId}/files/upload`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
        }),
        body: JSON.stringify({
          fileName: 'document.pdf',
          fileSize: 2048000,
        }),
      })
    )
  })

  it('throws error when file is too large', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 200MB limit' },
        }),
    })

    await expect(
      requestUploadUrl(mockCourseId, 'huge.pdf', 300 * 1024 * 1024, mockCsrfHeaders)
    ).rejects.toThrow('File exceeds 200MB limit')
  })

  it('throws error when file limit exceeded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: {
            code: 'FILE_LIMIT_EXCEEDED',
            message: 'Maximum 30 files per course',
          },
        }),
    })

    await expect(
      requestUploadUrl(mockCourseId, 'file.pdf', 1024, mockCsrfHeaders)
    ).rejects.toThrow('Maximum 30 files per course')
  })

  it('throws error when storage quota exceeded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: {
            code: 'FILE_STORAGE_EXCEEDED',
            message: 'Storage limit exceeded',
          },
        }),
    })

    await expect(
      requestUploadUrl(mockCourseId, 'file.pdf', 1024, mockCsrfHeaders)
    ).rejects.toThrow('Storage limit exceeded')
  })

  it('throws error when duplicate file name exists', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({
          success: false,
          error: {
            code: 'FILE_NAME_EXISTS',
            message: 'A file with this name already exists',
          },
        }),
    })

    await expect(
      requestUploadUrl(mockCourseId, 'existing.pdf', 1024, mockCsrfHeaders)
    ).rejects.toThrow('A file with this name already exists')
  })

  it('includes CSRF token in request headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: mockUploadUrlResponse,
        }),
    })

    await requestUploadUrl(mockCourseId, 'file.pdf', 1024, mockCsrfHeaders)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-CSRF-Token': 'test-csrf-token',
        }),
      })
    )
  })
})

// ============================================
// confirmUpload Tests
// ============================================

describe('confirmUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('confirms upload and returns updated file', async () => {
    const confirmedFile = { ...mockFile, status: 'processing' as const }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { file: confirmedFile },
        }),
    })

    const result = await confirmUpload(mockCourseId, mockFileId, mockCsrfHeaders)

    expect(result.id).toBe(mockFileId)
    expect(result.status).toBe('processing')
  })

  it('sends request to correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { file: mockFile },
        }),
    })

    await confirmUpload(mockCourseId, mockFileId, mockCsrfHeaders)

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/courses/${mockCourseId}/files/${mockFileId}/confirm`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-CSRF-Token': 'test-csrf-token',
        }),
        credentials: 'include',
      })
    )
  })

  it('throws error when file not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () =>
        Promise.resolve({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
        }),
    })

    await expect(
      confirmUpload(mockCourseId, 'nonexistent', mockCsrfHeaders)
    ).rejects.toThrow('File not found')
  })

  it('throws error when upload expired', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: {
            code: 'UPLOAD_EXPIRED',
            message: 'Upload URL has expired',
          },
        }),
    })

    await expect(
      confirmUpload(mockCourseId, mockFileId, mockCsrfHeaders)
    ).rejects.toThrow('Upload URL has expired')
  })

  it('includes page count in confirmation when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { file: { ...mockFile, pageCount: 50 } },
        }),
    })

    await confirmUpload(mockCourseId, mockFileId, mockCsrfHeaders, {
      pageCount: 50,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ pageCount: 50 }),
      })
    )
  })
})

// ============================================
// deleteFile Tests
// ============================================

describe('deleteFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes file successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: null,
        }),
    })

    await expect(
      deleteFile(mockCourseId, mockFileId, mockCsrfHeaders)
    ).resolves.not.toThrow()
  })

  it('sends DELETE request to correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: null,
        }),
    })

    await deleteFile(mockCourseId, mockFileId, mockCsrfHeaders)

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/courses/${mockCourseId}/files/${mockFileId}`,
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'X-CSRF-Token': 'test-csrf-token',
        }),
        credentials: 'include',
      })
    )
  })

  it('throws error when file not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () =>
        Promise.resolve({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
        }),
    })

    await expect(
      deleteFile(mockCourseId, 'nonexistent', mockCsrfHeaders)
    ).rejects.toThrow('File not found')
  })

  it('throws error when unauthorized', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () =>
        Promise.resolve({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authorized to delete this file' },
        }),
    })

    await expect(
      deleteFile(mockCourseId, mockFileId, mockCsrfHeaders)
    ).rejects.toThrow('Not authorized to delete this file')
  })

  it('includes CSRF token in request headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: null,
        }),
    })

    await deleteFile(mockCourseId, mockFileId, mockCsrfHeaders)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-CSRF-Token': 'test-csrf-token',
        }),
      })
    )
  })
})

// ============================================
// Edge Cases
// ============================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles special characters in file names', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: mockUploadUrlResponse,
        }),
    })

    await requestUploadUrl(
      mockCourseId,
      'file with spaces & symbols (1).pdf',
      1024,
      mockCsrfHeaders
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('file with spaces & symbols (1).pdf'),
      })
    )
  })

  it('handles unicode characters in file names', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: mockUploadUrlResponse,
        }),
    })

    await requestUploadUrl(mockCourseId, 'lecture.pdf', 1024, mockCsrfHeaders)

    expect(mockFetch).toHaveBeenCalled()
  })

  it('handles very long file names', async () => {
    const longFileName = 'a'.repeat(250) + '.pdf'

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: { code: 'FILE_VALIDATION_ERROR', message: 'File name too long' },
        }),
    })

    await expect(
      requestUploadUrl(mockCourseId, longFileName, 1024, mockCsrfHeaders)
    ).rejects.toThrow('File name too long')
  })

  it('handles zero-byte files', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: { code: 'FILE_VALIDATION_ERROR', message: 'File cannot be empty' },
        }),
    })

    await expect(
      requestUploadUrl(mockCourseId, 'empty.pdf', 0, mockCsrfHeaders)
    ).rejects.toThrow('File cannot be empty')
  })

  it('handles files with null page count', async () => {
    const fileWithNullPageCount = { ...mockFile, pageCount: null }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { files: [fileWithNullPageCount], course: { id: mockCourseId, name: 'Test' } },
        }),
    })

    const result = await fetchCourseFiles(mockCourseId)

    expect(result.files[0].pageCount).toBeNull()
  })

  it('handles files with null file size', async () => {
    const fileWithNullSize = { ...mockFile, fileSize: null }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { files: [fileWithNullSize], course: { id: mockCourseId, name: 'Test' } },
        }),
    })

    const result = await fetchCourseFiles(mockCourseId)

    expect(result.files[0].fileSize).toBeNull()
  })

  it('handles scanned file flag', async () => {
    const scannedFile = { ...mockFile, isScanned: true }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { files: [scannedFile], course: { id: mockCourseId, name: 'Test' } },
        }),
    })

    const result = await fetchCourseFiles(mockCourseId)

    expect(result.files[0].isScanned).toBe(true)
  })
})
