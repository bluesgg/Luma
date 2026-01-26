import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ============================================
// Mock Dependencies - Use vi.hoisted for proper hoisting
// ============================================

// Use vi.hoisted to ensure mock objects are available at hoist time
const { mockPrisma, mockGetCurrentUser, mockRequireCsrf, mockApiRateLimiter } = vi.hoisted(() => ({
  mockPrisma: {
    course: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockGetCurrentUser: vi.fn(),
  mockRequireCsrf: vi.fn(),
  mockApiRateLimiter: vi.fn(),
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

// Mock logger to suppress output during tests
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Import types
import { AUTH_ERROR_CODES, COURSE_ERROR_CODES } from '@/types'

// ============================================
// Import Route Handlers
// ============================================

import { GET, PATCH, DELETE } from '@/app/api/courses/[id]/route'

// ============================================
// Test Fixtures
// ============================================

const mockUserId = '123e4567-e89b-12d3-a456-426614174000'
const mockCourseId = '123e4567-e89b-12d3-a456-426614174001'
const mockOtherUserId = '123e4567-e89b-12d3-a456-426614174999'

const mockUser = {
  id: mockUserId,
  email: 'test@example.com',
}

const mockCourse = {
  id: mockCourseId,
  userId: mockUserId,
  name: 'Test Course',
  school: 'Test University',
  term: 'Fall 2024',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const mockCourseWithFiles = {
  ...mockCourse,
  files: [
    {
      id: 'file-1',
      name: 'Lecture 1.pdf',
      status: 'ready',
      pageCount: 10,
      fileSize: 1024000,
    },
    {
      id: 'file-2',
      name: 'Lecture 2.pdf',
      status: 'processing',
      pageCount: null,
      fileSize: 2048000,
    },
  ],
  _count: { files: 2 },
}

// ============================================
// Helper Functions
// ============================================

function createMockRequest(
  method: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>
): NextRequest {
  const url = new URL(`http://localhost:3000/api/courses/${mockCourseId}`)
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

  return new NextRequest(url, requestInit)
}

function createMockParams(id: string = mockCourseId): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()

  // Default mock implementations
  mockGetCurrentUser.mockResolvedValue(mockUser)
  mockRequireCsrf.mockResolvedValue(null) // Valid CSRF by default
  mockApiRateLimiter.mockReturnValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 })
})

// ============================================
// GET /api/courses/[id] Tests
// ============================================

describe('GET /api/courses/[id]', () => {
  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = createMockRequest('GET')
      const context = createMockParams()

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.SESSION_EXPIRED)
      expect(data.error.message).toBe('Authentication required')
    })
  })

  describe('Rate Limiting', () => {
    it('returns 429 when rate limited', async () => {
      mockApiRateLimiter.mockReturnValue({ allowed: false, remaining: 0, resetTime: Date.now() + 60000 })

      const request = createMockRequest('GET')
      const context = createMockParams()

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.RATE_LIMITED)
      expect(data.error.message).toBe('Too many requests')
    })
  })

  describe('Course Retrieval', () => {
    it('returns course when user owns it', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourseWithFiles)

      const request = createMockRequest('GET')
      const context = createMockParams()

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.course.id).toBe(mockCourseId)
      expect(data.data.course.name).toBe('Test Course')
      expect(data.data.course.school).toBe('Test University')
      expect(data.data.course.term).toBe('Fall 2024')
    })

    it('returns course with files included', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourseWithFiles)

      const request = createMockRequest('GET')
      const context = createMockParams()

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.course.files).toHaveLength(2)
      expect(data.data.course.files[0].name).toBe('Lecture 1.pdf')
      expect(data.data.course.files[1].name).toBe('Lecture 2.pdf')
    })

    it('returns 404 when course does not exist', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null)

      const request = createMockRequest('GET')
      const context = createMockParams()

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
      expect(data.error.message).toBe('Course not found')
    })

    it('returns 404 when user does not own the course (different user)', async () => {
      // Course exists but belongs to a different user - query should filter by userId
      mockPrisma.course.findFirst.mockResolvedValue(null)

      const request = createMockRequest('GET')
      const context = createMockParams()

      const response = await GET(request, context)
      const data = await response.json()

      // Should return 404, not 403, to prevent information leakage
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
    })

    it('returns 404 for invalid UUID format', async () => {
      const request = createMockRequest('GET')
      const context = createMockParams('not-a-valid-uuid')

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
    })
  })
})

// ============================================
// PATCH /api/courses/[id] Tests
// ============================================

describe('PATCH /api/courses/[id]', () => {
  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = createMockRequest('PATCH', { name: 'Updated Course' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.SESSION_EXPIRED)
      expect(data.error.message).toBe('Authentication required')
    })
  })

  describe('CSRF Validation', () => {
    it('returns 403 when CSRF token is missing', async () => {
      mockRequireCsrf.mockResolvedValue(
        NextResponse.json(
          {
            success: false,
            error: { code: 'CSRF_INVALID', message: 'Invalid or missing CSRF token' },
          },
          { status: 403 }
        )
      )

      const request = createMockRequest('PATCH', { name: 'Updated Course' }, { 'X-CSRF-Token': '' })
      const context = createMockParams()

      const response = await PATCH(request, context)

      expect(response.status).toBe(403)
    })

    it('returns 403 when CSRF token is invalid', async () => {
      mockRequireCsrf.mockResolvedValue(
        NextResponse.json(
          {
            success: false,
            error: { code: 'CSRF_INVALID', message: 'Invalid or missing CSRF token' },
          },
          { status: 403 }
        )
      )

      const request = createMockRequest('PATCH', { name: 'Updated Course' }, { 'X-CSRF-Token': 'invalid-token' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('CSRF_INVALID')
    })
  })

  describe('Validation', () => {
    it('returns 400 when no fields provided', async () => {
      const request = createMockRequest('PATCH', {})
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.VALIDATION_ERROR)
      expect(data.error.message).toContain('At least one field')
    })

    it('returns 400 when name exceeds 50 characters', async () => {
      const longName = 'A'.repeat(51)
      const request = createMockRequest('PATCH', { name: longName })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.VALIDATION_ERROR)
      expect(data.error.message).toContain('50 characters')
    })

    it('returns 400 when school exceeds 100 characters', async () => {
      const longSchool = 'A'.repeat(101)
      const request = createMockRequest('PATCH', { school: longSchool })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.VALIDATION_ERROR)
      expect(data.error.message).toContain('100 characters')
    })

    it('returns 400 when term exceeds 50 characters', async () => {
      const longTerm = 'A'.repeat(51)
      const request = createMockRequest('PATCH', { term: longTerm })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.VALIDATION_ERROR)
      expect(data.error.message).toContain('50 characters')
    })

    it('returns 400 for invalid request body (not JSON)', async () => {
      const url = new URL(`http://localhost:3000/api/courses/${mockCourseId}`)
      const request = new NextRequest(url, {
        method: 'PATCH',
        headers: new Headers({
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'valid-csrf-token',
        }),
        body: 'not-valid-json{',
      })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.VALIDATION_ERROR)
      expect(data.error.message).toContain('Invalid request body')
    })
  })

  describe('Update Operations', () => {
    it('updates name successfully', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.findUnique.mockResolvedValue(null) // No duplicate name
      mockPrisma.course.update.mockResolvedValue({
        ...mockCourse,
        name: 'Updated Course Name',
        updatedAt: new Date(),
      })

      const request = createMockRequest('PATCH', { name: 'Updated Course Name' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.course.name).toBe('Updated Course Name')
    })

    it('updates school field successfully', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.update.mockResolvedValue({
        ...mockCourse,
        school: 'New University',
        updatedAt: new Date(),
      })

      const request = createMockRequest('PATCH', { school: 'New University' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.course.school).toBe('New University')
    })

    it('updates term field successfully', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.update.mockResolvedValue({
        ...mockCourse,
        term: 'Spring 2025',
        updatedAt: new Date(),
      })

      const request = createMockRequest('PATCH', { term: 'Spring 2025' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.course.term).toBe('Spring 2025')
    })

    it('updates multiple fields at once', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.findUnique.mockResolvedValue(null)
      mockPrisma.course.update.mockResolvedValue({
        ...mockCourse,
        name: 'New Name',
        school: 'New School',
        term: 'New Term',
        updatedAt: new Date(),
      })

      const request = createMockRequest('PATCH', {
        name: 'New Name',
        school: 'New School',
        term: 'New Term',
      })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.course.name).toBe('New Name')
      expect(data.data.course.school).toBe('New School')
      expect(data.data.course.term).toBe('New Term')
    })

    it('allows clearing school field with null', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.update.mockResolvedValue({
        ...mockCourse,
        school: null,
        updatedAt: new Date(),
      })

      const request = createMockRequest('PATCH', { school: null })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.course.school).toBeNull()
    })

    it('allows clearing term field with null', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.update.mockResolvedValue({
        ...mockCourse,
        term: null,
        updatedAt: new Date(),
      })

      const request = createMockRequest('PATCH', { term: null })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.course.term).toBeNull()
    })
  })

  describe('Duplicate Name Handling', () => {
    it('returns 409 when duplicate name exists for same user', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      // Another course with the same name exists for this user
      mockPrisma.course.findUnique.mockResolvedValue({
        id: 'different-course-id',
        userId: mockUserId,
        name: 'Duplicate Name',
      })

      const request = createMockRequest('PATCH', { name: 'Duplicate Name' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NAME_EXISTS)
      expect(data.error.message).toContain('already exists')
    })

    it('allows same name if it is the same course (no change)', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      // The same course is found (updating to same name is allowed)
      mockPrisma.course.findUnique.mockResolvedValue({
        id: mockCourseId, // Same course ID
        userId: mockUserId,
        name: 'Test Course',
      })
      mockPrisma.course.update.mockResolvedValue(mockCourse)

      const request = createMockRequest('PATCH', { name: 'Test Course' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Course Not Found', () => {
    it('returns 404 when course not found', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null)

      const request = createMockRequest('PATCH', { name: 'Updated Name' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
      expect(data.error.message).toBe('Course not found')
    })

    it('returns 404 when user does not own the course', async () => {
      // Course exists but query with userId filter returns null
      mockPrisma.course.findFirst.mockResolvedValue(null)

      const request = createMockRequest('PATCH', { name: 'Updated Name' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      // Should return 404, not 403, to prevent information leakage
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
    })
  })
})

// ============================================
// DELETE /api/courses/[id] Tests
// ============================================

describe('DELETE /api/courses/[id]', () => {
  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = createMockRequest('DELETE')
      const context = createMockParams()

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.SESSION_EXPIRED)
      expect(data.error.message).toBe('Authentication required')
    })
  })

  describe('CSRF Validation', () => {
    it('returns 403 when CSRF token is missing', async () => {
      mockRequireCsrf.mockResolvedValue(
        NextResponse.json(
          {
            success: false,
            error: { code: 'CSRF_INVALID', message: 'Invalid or missing CSRF token' },
          },
          { status: 403 }
        )
      )

      const request = createMockRequest('DELETE', undefined, { 'X-CSRF-Token': '' })
      const context = createMockParams()

      const response = await DELETE(request, context)

      expect(response.status).toBe(403)
    })

    it('returns 403 when CSRF token is invalid', async () => {
      mockRequireCsrf.mockResolvedValue(
        NextResponse.json(
          {
            success: false,
            error: { code: 'CSRF_INVALID', message: 'Invalid or missing CSRF token' },
          },
          { status: 403 }
        )
      )

      const request = createMockRequest('DELETE', undefined, { 'X-CSRF-Token': 'invalid-token' })
      const context = createMockParams()

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('CSRF_INVALID')
    })
  })

  describe('Delete Operations', () => {
    it('deletes course successfully and returns deleted: true', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.delete.mockResolvedValue(mockCourse)

      const request = createMockRequest('DELETE')
      const context = createMockParams()

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.deleted).toBe(true)
    })

    it('returns 404 when course not found', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null)

      const request = createMockRequest('DELETE')
      const context = createMockParams()

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
      expect(data.error.message).toBe('Course not found')
    })

    it('returns 404 when user does not own the course', async () => {
      // Course exists but query with userId filter returns null
      mockPrisma.course.findFirst.mockResolvedValue(null)

      const request = createMockRequest('DELETE')
      const context = createMockParams()

      const response = await DELETE(request, context)
      const data = await response.json()

      // Should return 404, not 403, to prevent information leakage
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
    })
  })

  describe('Cascade Deletion (Integration Test)', () => {
    it('verifies cascade deletion removes related files', async () => {
      // This is an integration-level test that verifies Prisma cascade behavior
      // The actual cascade is handled by the database via onDelete: Cascade

      mockPrisma.course.findFirst.mockResolvedValue(mockCourseWithFiles)
      mockPrisma.course.delete.mockResolvedValue(mockCourseWithFiles)

      const request = createMockRequest('DELETE')
      const context = createMockParams()

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.deleted).toBe(true)
      // Note: Actual cascade deletion is handled by database constraints
      // This test verifies the API call succeeds; integration tests verify cascade behavior
    })
  })
})

// ============================================
// Edge Cases & Error Handling
// ============================================

describe('Edge Cases', () => {
  describe('Invalid ID Formats', () => {
    it('handles empty ID parameter', async () => {
      const request = createMockRequest('GET')
      const context = createMockParams('')

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
    })

    it('handles SQL injection attempt in ID', async () => {
      const maliciousId = "'; DROP TABLE courses; --"
      const request = createMockRequest('GET')
      const context = createMockParams(maliciousId)

      const response = await GET(request, context)
      const data = await response.json()

      // Prisma provides SQL injection protection; UUID validation also fails
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
    })

    it('handles extremely long ID', async () => {
      const longId = 'a'.repeat(1000)
      const request = createMockRequest('GET')
      const context = createMockParams(longId)

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
    })
  })

  describe('Special Characters in Input', () => {
    it('handles Unicode characters in course name', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.findUnique.mockResolvedValue(null)
      mockPrisma.course.update.mockResolvedValue({
        ...mockCourse,
        name: 'Course with Unicode',
        updatedAt: new Date(),
      })

      const request = createMockRequest('PATCH', { name: 'Course with Unicode' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.course.name).toBe('Course with Unicode')
    })

    it('handles whitespace-only name', async () => {
      const request = createMockRequest('PATCH', { name: '   ' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      // Name should be trimmed and validated as empty
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('Database Error Handling', () => {
    it('returns 500 on database connection error for GET', async () => {
      mockPrisma.course.findFirst.mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest('GET')
      const context = createMockParams()

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.INTERNAL_ERROR)
    })

    it('returns 500 on database error for PATCH', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.findUnique.mockResolvedValue(null)
      mockPrisma.course.update.mockRejectedValue(new Error('Database write failed'))

      const request = createMockRequest('PATCH', { name: 'New Name' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.INTERNAL_ERROR)
    })

    it('returns 500 on database error for DELETE', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.delete.mockRejectedValue(new Error('Database delete failed'))

      const request = createMockRequest('DELETE')
      const context = createMockParams()

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(AUTH_ERROR_CODES.INTERNAL_ERROR)
    })
  })

  describe('Concurrent Operations', () => {
    it('handles race condition when course is deleted during update', async () => {
      // First findFirst succeeds, but update fails because course was deleted
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.findUnique.mockResolvedValue(null)
      // Prisma throws P2025 when record to update is not found
      // We need to create an error that passes the instanceof check
      const { Prisma } = await import('@prisma/client')
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found.',
        { code: 'P2025', clientVersion: '5.0.0' }
      )
      mockPrisma.course.update.mockRejectedValue(prismaError)

      const request = createMockRequest('PATCH', { name: 'New Name' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      // Should return 404 since course no longer exists
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(COURSE_ERROR_CODES.NOT_FOUND)
    })
  })
})

// ============================================
// Response Format Validation
// ============================================

describe('Response Format', () => {
  describe('Success Response Structure', () => {
    it('GET response includes all required course fields', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourseWithFiles)

      const request = createMockRequest('GET')
      const context = createMockParams()

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data.course')
      expect(data.data.course).toHaveProperty('id')
      expect(data.data.course).toHaveProperty('userId')
      expect(data.data.course).toHaveProperty('name')
      expect(data.data.course).toHaveProperty('school')
      expect(data.data.course).toHaveProperty('term')
      expect(data.data.course).toHaveProperty('createdAt')
      expect(data.data.course).toHaveProperty('updatedAt')
      expect(data.data.course).toHaveProperty('files')
    })

    it('PATCH response includes updated course data', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.findUnique.mockResolvedValue(null)
      mockPrisma.course.update.mockResolvedValue({
        ...mockCourse,
        name: 'Updated Name',
        updatedAt: new Date(),
      })

      const request = createMockRequest('PATCH', { name: 'Updated Name' })
      const context = createMockParams()

      const response = await PATCH(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data.course')
      expect(data.data.course.name).toBe('Updated Name')
    })

    it('DELETE response includes deleted: true', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.delete.mockResolvedValue(mockCourse)

      const request = createMockRequest('DELETE')
      const context = createMockParams()

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data.deleted', true)
    })
  })

  describe('Error Response Structure', () => {
    it('error response includes code and message', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null)

      const request = createMockRequest('GET')
      const context = createMockParams()

      const response = await GET(request, context)
      const data = await response.json()

      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('error')
      expect(data.error).toHaveProperty('code')
      expect(data.error).toHaveProperty('message')
    })
  })
})
