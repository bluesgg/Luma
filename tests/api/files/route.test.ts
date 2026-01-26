import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ============================================
// Mock Dependencies
// ============================================

const { mockPrisma, mockGetCurrentUser, mockRequireCsrf, mockApiRateLimiter, mockStorage } = vi.hoisted(() => ({
  mockPrisma: {
    file: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    course: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockGetCurrentUser: vi.fn(),
  mockRequireCsrf: vi.fn(),
  mockApiRateLimiter: vi.fn(),
  mockStorage: {
    checkStorageLimits: vi.fn(),
    buildStoragePath: vi.fn(),
    createSignedUploadUrl: vi.fn(),
    createSignedDownloadUrl: vi.fn(),
    deleteStorageFile: vi.fn(),
    fileExistsInStorage: vi.fn(),
    downloadFile: vi.fn(),
    detectScannedPdf: vi.fn(),
    getPdfPageCount: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  createAuthError: (code: string, message: string) => ({
    success: false,
    error: { code, message },
  }),
  createAuthSuccess: <T>(data: T) => ({
    success: true,
    data,
  }),
}))

vi.mock('@/lib/csrf', () => ({
  requireCsrf: (request: NextRequest) => mockRequireCsrf(request),
}))

vi.mock('@/lib/rate-limit', () => ({
  apiRateLimiter: (key: string) => mockApiRateLimiter(key),
  getRateLimitKey: (ip: string | null, userId?: string, endpoint?: string) => {
    const identifier = userId ?? ip ?? 'anonymous'
    return endpoint ? `${endpoint}:${identifier}` : identifier
  },
}))

vi.mock('@/lib/storage', () => mockStorage)

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Import types
import { AUTH_ERROR_CODES, FILE_ERROR_CODES, COURSE_ERROR_CODES } from '@/types'

// ============================================
// Test Fixtures
// ============================================

const mockUserId = '123e4567-e89b-12d3-a456-426614174000'
const mockCourseId = '123e4567-e89b-12d3-a456-426614174001'
const mockFileId = '123e4567-e89b-12d3-a456-426614174002'

const mockUser = {
  id: mockUserId,
  email: 'test@example.com',
}

const mockCourse = {
  id: mockCourseId,
  userId: mockUserId,
  name: 'Test Course',
}

const mockFile = {
  id: mockFileId,
  courseId: mockCourseId,
  userId: mockUserId,
  name: 'Lecture 1.pdf',
  type: 'lecture',
  pageCount: 25,
  fileSize: BigInt(5242880), // 5MB
  isScanned: false,
  status: 'ready',
  storagePath: `${mockUserId}/${mockCourseId}/${mockFileId}.pdf`,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const mockFiles = [
  mockFile,
  {
    id: '123e4567-e89b-12d3-a456-426614174003',
    courseId: mockCourseId,
    userId: mockUserId,
    name: 'Lecture 2.pdf',
    type: 'lecture',
    pageCount: 30,
    fileSize: BigInt(7340032), // 7MB
    isScanned: false,
    status: 'ready',
    storagePath: `${mockUserId}/${mockCourseId}/123e4567-e89b-12d3-a456-426614174003.pdf`,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174004',
    courseId: mockCourseId,
    userId: mockUserId,
    name: 'Lecture 3.pdf',
    type: 'lecture',
    pageCount: null,
    fileSize: BigInt(3145728), // 3MB
    isScanned: false,
    status: 'processing',
    storagePath: `${mockUserId}/${mockCourseId}/123e4567-e89b-12d3-a456-426614174004.pdf`,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
  },
]

// ============================================
// Helper Functions
// ============================================

function createMockRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>
): NextRequest {
  const requestUrl = new URL(`http://localhost:3000${url}`)
  const requestInit: {
    method: string
    headers: Headers
    body?: string
  } = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      'X-CSRF-Token': 'valid-csrf-token',
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    }),
  }

  if (body && method !== 'GET' && method !== 'DELETE') {
    requestInit.body = JSON.stringify(body)
  }

  return new NextRequest(requestUrl, requestInit)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockParams(params: Record<string, string>): any {
  return { params: Promise.resolve(params) }
}

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()

  // Default mock implementations
  mockGetCurrentUser.mockResolvedValue(mockUser)
  mockRequireCsrf.mockResolvedValue(null)
  mockApiRateLimiter.mockReturnValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 })
})

// ============================================
// GET /api/courses/[id]/files Tests
// ============================================

describe('GET /api/courses/[id]/files', () => {
  // Lazy import to allow mocks to be set up first
  const getHandler = async () => {
    const { GET } = await import('@/app/api/courses/[id]/files/route')
    return GET
  }

  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const GET = await getHandler()
      const request = createMockRequest('GET', `/api/courses/${mockCourseId}/files`)
      const context = createMockParams({ id: mockCourseId })

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.SESSION_EXPIRED)
    })
  })

  describe('Rate Limiting', () => {
    it('returns 429 when rate limited', async () => {
      mockApiRateLimiter.mockReturnValue({ allowed: false, remaining: 0, resetTime: Date.now() + 60000 })

      const GET = await getHandler()
      const request = createMockRequest('GET', `/api/courses/${mockCourseId}/files`)
      const context = createMockParams({ id: mockCourseId })

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.RATE_LIMITED)
    })
  })

  describe('Course Validation', () => {
    it('returns 404 when course not found', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null)

      const GET = await getHandler()
      const request = createMockRequest('GET', `/api/courses/${mockCourseId}/files`)
      const context = createMockParams({ id: mockCourseId })

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
    })

    it('returns 404 for invalid UUID format', async () => {
      const GET = await getHandler()
      const request = createMockRequest('GET', '/api/courses/invalid-uuid/files')
      const context = createMockParams({ id: 'invalid-uuid' })

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
    })
  })

  describe('File Listing', () => {
    it('returns files for owned course', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.file.findMany.mockResolvedValue(mockFiles)

      const GET = await getHandler()
      const request = createMockRequest('GET', `/api/courses/${mockCourseId}/files`)
      const context = createMockParams({ id: mockCourseId })

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.files).toHaveLength(3)
      expect(data.data.files[0].name).toBe('Lecture 1.pdf')
    })

    it('returns empty array when course has no files', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.file.findMany.mockResolvedValue([])

      const GET = await getHandler()
      const request = createMockRequest('GET', `/api/courses/${mockCourseId}/files`)
      const context = createMockParams({ id: mockCourseId })

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.files).toHaveLength(0)
    })

    it('orders files by createdAt descending', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.file.findMany.mockResolvedValue(mockFiles)

      const GET = await getHandler()
      const request = createMockRequest('GET', `/api/courses/${mockCourseId}/files`)
      const context = createMockParams({ id: mockCourseId })

      await GET(request, context)

      expect(mockPrisma.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })
  })
})

// ============================================
// POST /api/files/upload-url Tests
// ============================================

describe('POST /api/files/upload-url', () => {
  const getHandler = async () => {
    const { POST } = await import('@/app/api/files/upload-url/route')
    return POST
  }

  const validUploadRequest = {
    courseId: mockCourseId,
    fileName: 'New Lecture.pdf',
    fileSize: 10485760, // 10MB
  }

  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', validUploadRequest)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.SESSION_EXPIRED)
    })
  })

  describe('CSRF Validation', () => {
    it('returns 403 when CSRF token is invalid', async () => {
      mockRequireCsrf.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token' } },
          { status: 403 }
        )
      )

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', validUploadRequest)

      const response = await POST(request)

      expect(response.status).toBe(403)
    })
  })

  describe('Validation', () => {
    it('returns 400 when courseId is missing', async () => {
      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', {
        fileName: 'test.pdf',
        fileSize: 1000,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(FILE_ERROR_CODES.VALIDATION_ERROR)
    })

    it('returns 400 when fileName is missing', async () => {
      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', {
        courseId: mockCourseId,
        fileSize: 1000,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(FILE_ERROR_CODES.VALIDATION_ERROR)
    })

    it('returns 400 when fileSize is missing', async () => {
      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', {
        courseId: mockCourseId,
        fileName: 'test.pdf',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(FILE_ERROR_CODES.VALIDATION_ERROR)
    })

    it('returns 400 when fileName does not end with .pdf', async () => {
      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', {
        courseId: mockCourseId,
        fileName: 'test.txt',
        fileSize: 1000,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(FILE_ERROR_CODES.INVALID_TYPE)
    })

    it('returns 400 when fileSize is negative', async () => {
      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', {
        courseId: mockCourseId,
        fileName: 'test.pdf',
        fileSize: -100,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(FILE_ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('Course Ownership', () => {
    it('returns 404 when course not found', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null)

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', validUploadRequest)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
    })
  })

  describe('Storage Limits', () => {
    it('returns 400 when file exceeds 200MB', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockStorage.checkStorageLimits.mockResolvedValue({
        allowed: false,
        error: { code: FILE_ERROR_CODES.TOO_LARGE, message: 'File too large' },
      })

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', {
        ...validUploadRequest,
        fileSize: 250 * 1024 * 1024, // 250MB
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(FILE_ERROR_CODES.TOO_LARGE)
    })

    it('returns 400 when course has 30 files', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockStorage.checkStorageLimits.mockResolvedValue({
        allowed: false,
        error: { code: FILE_ERROR_CODES.LIMIT_EXCEEDED, message: 'Course file limit reached' },
      })

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', validUploadRequest)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(FILE_ERROR_CODES.LIMIT_EXCEEDED)
    })

    it('returns 400 when user storage exceeds 5GB', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockStorage.checkStorageLimits.mockResolvedValue({
        allowed: false,
        error: { code: FILE_ERROR_CODES.STORAGE_EXCEEDED, message: 'Storage quota exceeded' },
      })

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', validUploadRequest)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(FILE_ERROR_CODES.STORAGE_EXCEEDED)
    })

    it('returns 409 when file name already exists in course', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockStorage.checkStorageLimits.mockResolvedValue({
        allowed: false,
        error: { code: FILE_ERROR_CODES.NAME_EXISTS, message: 'File name already exists' },
      })

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', validUploadRequest)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error.code).toBe(FILE_ERROR_CODES.NAME_EXISTS)
    })
  })

  describe('Upload URL Generation', () => {
    it('creates file record and returns signed URL on success', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockStorage.checkStorageLimits.mockResolvedValue({ allowed: true })
      mockStorage.buildStoragePath.mockReturnValue(`${mockUserId}/${mockCourseId}/new-file-id.pdf`)
      mockStorage.createSignedUploadUrl.mockResolvedValue({
        signedUrl: 'https://storage.example.com/upload?token=abc',
        token: 'abc',
      })
      mockPrisma.file.create.mockResolvedValue({
        ...mockFile,
        id: 'new-file-id',
        name: 'New Lecture.pdf',
        status: 'uploading',
      })

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', validUploadRequest)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('fileId')
      expect(data.data).toHaveProperty('uploadUrl')
      expect(data.data).toHaveProperty('token')
    })

    it('creates file with uploading status', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockStorage.checkStorageLimits.mockResolvedValue({ allowed: true })
      mockStorage.buildStoragePath.mockReturnValue(`${mockUserId}/${mockCourseId}/new-file-id.pdf`)
      mockStorage.createSignedUploadUrl.mockResolvedValue({
        signedUrl: 'https://storage.example.com/upload',
        token: 'abc',
      })
      mockPrisma.file.create.mockResolvedValue({
        ...mockFile,
        status: 'uploading',
      })

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', validUploadRequest)

      await POST(request)

      expect(mockPrisma.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'uploading',
          }),
        })
      )
    })

    it('returns 500 when storage URL generation fails', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockStorage.checkStorageLimits.mockResolvedValue({ allowed: true })
      mockStorage.buildStoragePath.mockReturnValue(`${mockUserId}/${mockCourseId}/new-file-id.pdf`)
      mockStorage.createSignedUploadUrl.mockResolvedValue(null)

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/upload-url', validUploadRequest)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.INTERNAL_ERROR)
    })
  })
})

// ============================================
// POST /api/files/confirm Tests
// ============================================

describe('POST /api/files/confirm', () => {
  const getHandler = async () => {
    const { POST } = await import('@/app/api/files/confirm/route')
    return POST
  }

  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/confirm', { fileId: mockFileId })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.SESSION_EXPIRED)
    })
  })

  describe('CSRF Validation', () => {
    it('returns 403 when CSRF token is invalid', async () => {
      mockRequireCsrf.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token' } },
          { status: 403 }
        )
      )

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/confirm', { fileId: mockFileId })

      const response = await POST(request)

      expect(response.status).toBe(403)
    })
  })

  describe('Validation', () => {
    it('returns 400 when fileId is missing', async () => {
      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/confirm', {})

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(FILE_ERROR_CODES.VALIDATION_ERROR)
    })

    it('returns 404 for invalid UUID format', async () => {
      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/confirm', { fileId: 'invalid-uuid' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe(FILE_ERROR_CODES.NOT_FOUND)
    })
  })

  describe('File Validation', () => {
    it('returns 404 when file not found', async () => {
      mockPrisma.file.findFirst.mockResolvedValue(null)

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/confirm', { fileId: mockFileId })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe(FILE_ERROR_CODES.NOT_FOUND)
    })

    it('returns 400 when file is not in uploading status', async () => {
      mockPrisma.file.findFirst.mockResolvedValue({
        ...mockFile,
        status: 'ready',
      })

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/confirm', { fileId: mockFileId })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(FILE_ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('Confirmation Process', () => {
    it('updates status to processing then ready on success', async () => {
      mockPrisma.file.findFirst.mockResolvedValue({
        ...mockFile,
        status: 'uploading',
      })
      mockStorage.fileExistsInStorage.mockResolvedValue(true)
      mockStorage.downloadFile.mockResolvedValue(new ArrayBuffer(1000))
      mockStorage.detectScannedPdf.mockResolvedValue(false)
      mockStorage.getPdfPageCount.mockResolvedValue(25)
      mockPrisma.file.update.mockResolvedValue({
        ...mockFile,
        status: 'ready',
        pageCount: 25,
        isScanned: false,
      })

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/confirm', { fileId: mockFileId })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.file.status).toBe('ready')
    })

    it('sets isScanned to true when PDF is detected as scanned', async () => {
      mockPrisma.file.findFirst.mockResolvedValue({
        ...mockFile,
        status: 'uploading',
      })
      mockStorage.fileExistsInStorage.mockResolvedValue(true)
      mockStorage.downloadFile.mockResolvedValue(new ArrayBuffer(1000))
      mockStorage.detectScannedPdf.mockResolvedValue(true)
      mockStorage.getPdfPageCount.mockResolvedValue(25)
      mockPrisma.file.update.mockResolvedValue({
        ...mockFile,
        status: 'ready',
        isScanned: true,
      })

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/confirm', { fileId: mockFileId })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.file.isScanned).toBe(true)
    })

    it('updates status to failed when file not found in storage', async () => {
      mockPrisma.file.findFirst.mockResolvedValue({
        ...mockFile,
        status: 'uploading',
      })
      mockStorage.fileExistsInStorage.mockResolvedValue(false)
      mockPrisma.file.update.mockResolvedValue({
        ...mockFile,
        status: 'failed',
      })

      const POST = await getHandler()
      const request = createMockRequest('POST', '/api/files/confirm', { fileId: mockFileId })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.file.status).toBe('failed')
    })
  })
})

// ============================================
// DELETE /api/files/[id] Tests
// ============================================

describe('DELETE /api/files/[id]', () => {
  const getHandler = async () => {
    const { DELETE } = await import('@/app/api/files/[id]/route')
    return DELETE
  }

  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const DELETE = await getHandler()
      const request = createMockRequest('DELETE', `/api/files/${mockFileId}`)
      const context = createMockParams({ id: mockFileId })

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.SESSION_EXPIRED)
    })
  })

  describe('CSRF Validation', () => {
    it('returns 403 when CSRF token is invalid', async () => {
      mockRequireCsrf.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token' } },
          { status: 403 }
        )
      )

      const DELETE = await getHandler()
      const request = createMockRequest('DELETE', `/api/files/${mockFileId}`)
      const context = createMockParams({ id: mockFileId })

      const response = await DELETE(request, context)

      expect(response.status).toBe(403)
    })
  })

  describe('File Validation', () => {
    it('returns 404 when file not found', async () => {
      mockPrisma.file.findFirst.mockResolvedValue(null)

      const DELETE = await getHandler()
      const request = createMockRequest('DELETE', `/api/files/${mockFileId}`)
      const context = createMockParams({ id: mockFileId })

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe(FILE_ERROR_CODES.NOT_FOUND)
    })

    it('returns 404 for invalid UUID format', async () => {
      const DELETE = await getHandler()
      const request = createMockRequest('DELETE', '/api/files/invalid-uuid')
      const context = createMockParams({ id: 'invalid-uuid' })

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe(FILE_ERROR_CODES.NOT_FOUND)
    })
  })

  describe('Deletion', () => {
    it('deletes file from storage and database', async () => {
      mockPrisma.file.findFirst.mockResolvedValue(mockFile)
      mockStorage.deleteStorageFile.mockResolvedValue(true)
      mockPrisma.file.delete.mockResolvedValue(mockFile)

      const DELETE = await getHandler()
      const request = createMockRequest('DELETE', `/api/files/${mockFileId}`)
      const context = createMockParams({ id: mockFileId })

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.deleted).toBe(true)
      expect(mockStorage.deleteStorageFile).toHaveBeenCalledWith(mockFile.storagePath)
      expect(mockPrisma.file.delete).toHaveBeenCalled()
    })

    it('still deletes database record if storage deletion fails', async () => {
      mockPrisma.file.findFirst.mockResolvedValue(mockFile)
      mockStorage.deleteStorageFile.mockResolvedValue(false) // Storage delete fails
      mockPrisma.file.delete.mockResolvedValue(mockFile)

      const DELETE = await getHandler()
      const request = createMockRequest('DELETE', `/api/files/${mockFileId}`)
      const context = createMockParams({ id: mockFileId })

      const response = await DELETE(request, context)
      const data = await response.json()

      // Should still succeed - database record is the source of truth
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})

// ============================================
// GET /api/files/[id]/download-url Tests
// ============================================

describe('GET /api/files/[id]/download-url', () => {
  const getHandler = async () => {
    const { GET } = await import('@/app/api/files/[id]/download-url/route')
    return GET
  }

  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const GET = await getHandler()
      const request = createMockRequest('GET', `/api/files/${mockFileId}/download-url`)
      const context = createMockParams({ id: mockFileId })

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.SESSION_EXPIRED)
    })
  })

  describe('Rate Limiting', () => {
    it('returns 429 when rate limited', async () => {
      mockApiRateLimiter.mockReturnValue({ allowed: false, remaining: 0, resetTime: Date.now() + 60000 })

      const GET = await getHandler()
      const request = createMockRequest('GET', `/api/files/${mockFileId}/download-url`)
      const context = createMockParams({ id: mockFileId })

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.RATE_LIMITED)
    })
  })

  describe('File Validation', () => {
    it('returns 404 when file not found', async () => {
      mockPrisma.file.findFirst.mockResolvedValue(null)

      const GET = await getHandler()
      const request = createMockRequest('GET', `/api/files/${mockFileId}/download-url`)
      const context = createMockParams({ id: mockFileId })

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe(FILE_ERROR_CODES.NOT_FOUND)
    })

    it('returns 404 for invalid UUID format', async () => {
      const GET = await getHandler()
      const request = createMockRequest('GET', '/api/files/invalid-uuid/download-url')
      const context = createMockParams({ id: 'invalid-uuid' })

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe(FILE_ERROR_CODES.NOT_FOUND)
    })

    it('returns 400 when file is not ready', async () => {
      mockPrisma.file.findFirst.mockResolvedValue({
        ...mockFile,
        status: 'processing',
      })

      const GET = await getHandler()
      const request = createMockRequest('GET', `/api/files/${mockFileId}/download-url`)
      const context = createMockParams({ id: mockFileId })

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(FILE_ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('Download URL Generation', () => {
    it('returns signed download URL on success', async () => {
      mockPrisma.file.findFirst.mockResolvedValue(mockFile)
      mockStorage.createSignedDownloadUrl.mockResolvedValue('https://storage.example.com/download?token=xyz')

      const GET = await getHandler()
      const request = createMockRequest('GET', `/api/files/${mockFileId}/download-url`)
      const context = createMockParams({ id: mockFileId })

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('downloadUrl')
      expect(data.data).toHaveProperty('expiresIn')
    })

    it('returns 500 when URL generation fails', async () => {
      mockPrisma.file.findFirst.mockResolvedValue(mockFile)
      mockStorage.createSignedDownloadUrl.mockResolvedValue(null)

      const GET = await getHandler()
      const request = createMockRequest('GET', `/api/files/${mockFileId}/download-url`)
      const context = createMockParams({ id: mockFileId })

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.INTERNAL_ERROR)
    })
  })
})
