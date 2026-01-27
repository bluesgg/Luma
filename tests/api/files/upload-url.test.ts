// =============================================================================
// FILE-001: Upload URL API Tests (TDD)
// POST /api/files/upload-url
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES, FILE_LIMITS, COURSE_LIMITS } from '@/lib/constants'

async function requestUploadUrl(data: {
  fileName: string
  fileSize: number
  fileType: string
  courseId: string
}) {
  const response = await fetch('/api/files/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  }
}

describe('POST /api/files/upload-url', () => {
  let userId: string
  let courseId: string

  beforeEach(async () => {
    await prisma.user.deleteMany()
    await prisma.course.deleteMany()
    await prisma.file.deleteMany()

    // Create verified test user
    const user = await prisma.user.create({
      data: {
        email: 'verified@example.com',
        passwordHash: '$2b$10$hashedpassword',
        emailConfirmedAt: new Date(),
        role: 'STUDENT',
      },
    })
    userId = user.id

    // Create test course
    const course = await prisma.course.create({
      data: {
        userId,
        name: 'Test Course',
        school: 'Test University',
        term: 'Fall 2024',
      },
    })
    courseId = course.id
  })

  afterEach(async () => {
    await prisma.file.deleteMany()
    await prisma.course.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Happy Path', () => {
    it('should generate upload URL for valid PDF', async () => {
      const response = await requestUploadUrl({
        fileName: 'test.pdf',
        fileSize: 5 * 1024 * 1024, // 5MB
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.uploadUrl).toBeDefined()
      expect(response.data.data.fileId).toBeDefined()
      expect(response.data.data.storagePath).toBeDefined()
    })

    it('should create file record with UPLOADING status', async () => {
      const response = await requestUploadUrl({
        fileName: 'lecture.pdf',
        fileSize: 10 * 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      const fileId = response.data.data.fileId
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      })

      expect(file).toBeDefined()
      expect(file?.status).toBe('UPLOADING')
      expect(file?.name).toBe('lecture.pdf')
      expect(file?.courseId).toBe(courseId)
    })

    it('should set storagePath with correct pattern', async () => {
      const response = await requestUploadUrl({
        fileName: 'test.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      const storagePath = response.data.data.storagePath
      // Pattern: userId/courseId/fileId.pdf
      expect(storagePath).toMatch(/^[a-z0-9]+\/[a-z0-9]+\/[a-z0-9]+\.pdf$/)
    })

    it('should return signed URL with expiration', async () => {
      const response = await requestUploadUrl({
        fileName: 'test.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      const uploadUrl = response.data.data.uploadUrl
      expect(uploadUrl).toContain('https://')
      expect(uploadUrl).toBeDefined()
    })

    it('should store fileSize correctly', async () => {
      const fileSize = 25 * 1024 * 1024 // 25MB
      const response = await requestUploadUrl({
        fileName: 'large.pdf',
        fileSize,
        fileType: 'application/pdf',
        courseId,
      })

      const fileId = response.data.data.fileId
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      })

      expect(Number(file?.fileSize)).toBe(fileSize)
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests (401)', async () => {
      // Mock no session
      const response = await requestUploadUrl({
        fileName: 'test.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_UNAUTHORIZED)
    })

    it('should reject unverified email users (403)', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { emailConfirmedAt: null },
      })

      const response = await requestUploadUrl({
        fileName: 'test.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED)
    })
  })

  describe('Authorization', () => {
    it('should reject upload to other user course (403)', async () => {
      // Create another user's course
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          passwordHash: '$2b$10$hashedpassword',
          emailConfirmedAt: new Date(),
        },
      })

      const otherCourse = await prisma.course.create({
        data: {
          userId: otherUser.id,
          name: 'Other Course',
        },
      })

      const response = await requestUploadUrl({
        fileName: 'test.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId: otherCourse.id,
      })

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.COURSE_FORBIDDEN)
    })

    it('should reject non-existent course (404)', async () => {
      const response = await requestUploadUrl({
        fileName: 'test.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId: 'nonexistent-course-id',
      })

      expect(response.status).toBe(404)
      expect(response.data.error.code).toBe(ERROR_CODES.COURSE_NOT_FOUND)
    })
  })

  describe('Validation', () => {
    it('should reject empty fileName', async () => {
      const response = await requestUploadUrl({
        fileName: '',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject invalid fileType', async () => {
      const response = await requestUploadUrl({
        fileName: 'document.docx',
        fileSize: 1024 * 1024,
        fileType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        courseId,
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_INVALID_TYPE)
      expect(response.data.error.message).toContain('PDF')
    })

    it('should reject file larger than 200MB', async () => {
      const response = await requestUploadUrl({
        fileName: 'huge.pdf',
        fileSize: 201 * 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_TOO_LARGE)
      expect(response.data.error.message).toContain('200MB')
    })

    it('should reject negative fileSize', async () => {
      const response = await requestUploadUrl({
        fileName: 'test.pdf',
        fileSize: -1000,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject zero fileSize', async () => {
      const response = await requestUploadUrl({
        fileName: 'empty.pdf',
        fileSize: 0,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject invalid courseId format', async () => {
      const response = await requestUploadUrl({
        fileName: 'test.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId: 'invalid-id',
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('File Limits', () => {
    it('should reject duplicate file name in same course', async () => {
      // Create existing file
      await prisma.file.create({
        data: {
          courseId,
          name: 'existing.pdf',
          fileSize: BigInt(1024 * 1024),
          status: 'READY',
          storagePath: 'path/to/existing.pdf',
        },
      })

      const response = await requestUploadUrl({
        fileName: 'existing.pdf',
        fileSize: 2 * 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_DUPLICATE_NAME)
      expect(response.data.error.message).toContain('already exists')
    })

    it('should allow same filename in different courses', async () => {
      // Create another course
      const course2 = await prisma.course.create({
        data: {
          userId,
          name: 'Course 2',
        },
      })

      // Upload to first course
      await requestUploadUrl({
        fileName: 'lecture.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      // Upload same name to second course - should succeed
      const response = await requestUploadUrl({
        fileName: 'lecture.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId: course2.id,
      })

      expect(response.status).toBe(200)
    })

    it('should reject when course has 30 files', async () => {
      // Create 30 files
      for (let i = 0; i < FILE_LIMITS.MAX_FILES_PER_COURSE; i++) {
        await prisma.file.create({
          data: {
            courseId,
            name: `file-${i}.pdf`,
            fileSize: BigInt(1024 * 1024),
            status: 'READY',
            storagePath: `path/to/file-${i}.pdf`,
          },
        })
      }

      const response = await requestUploadUrl({
        fileName: 'new.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_DUPLICATE_NAME)
      expect(response.data.error.message).toContain('30')
    })

    it('should reject when user exceeds 5GB storage quota', async () => {
      // Create files totaling 5GB
      await prisma.file.create({
        data: {
          courseId,
          name: 'huge.pdf',
          fileSize: BigInt(FILE_LIMITS.MAX_STORAGE_PER_USER),
          status: 'READY',
          storagePath: 'path/to/huge.pdf',
        },
      })

      const response = await requestUploadUrl({
        fileName: 'new.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.STORAGE_LIMIT_REACHED)
      expect(response.data.error.message).toContain('5GB')
    })

    it('should count storage across all user courses', async () => {
      const course2 = await prisma.course.create({
        data: {
          userId,
          name: 'Course 2',
        },
      })

      // Add 3GB to course 1
      await prisma.file.create({
        data: {
          courseId,
          name: 'file1.pdf',
          fileSize: BigInt(3 * 1024 * 1024 * 1024),
          status: 'READY',
          storagePath: 'path/to/file1.pdf',
        },
      })

      // Add 2GB to course 2
      await prisma.file.create({
        data: {
          courseId: course2.id,
          name: 'file2.pdf',
          fileSize: BigInt(2 * 1024 * 1024 * 1024),
          status: 'READY',
          storagePath: 'path/to/file2.pdf',
        },
      })

      // Try to add 1MB more - should fail
      const response = await requestUploadUrl({
        fileName: 'tiny.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.STORAGE_LIMIT_REACHED)
    })
  })

  describe('Edge Cases', () => {
    it('should handle special characters in filename', async () => {
      const response = await requestUploadUrl({
        fileName: 'lecture-2024 (final).pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(200)
      const file = await prisma.file.findUnique({
        where: { id: response.data.data.fileId },
      })
      expect(file?.name).toBe('lecture-2024 (final).pdf')
    })

    it('should handle unicode characters in filename', async () => {
      const response = await requestUploadUrl({
        fileName: '课程资料.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(200)
    })

    it('should trim filename whitespace', async () => {
      const response = await requestUploadUrl({
        fileName: '  lecture.pdf  ',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(200)
      const file = await prisma.file.findUnique({
        where: { id: response.data.data.fileId },
      })
      expect(file?.name).toBe('lecture.pdf')
    })

    it('should reject filename longer than 255 characters', async () => {
      const longName = 'a'.repeat(250) + '.pdf'
      const response = await requestUploadUrl({
        fileName: longName,
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should handle concurrent uploads for same course', async () => {
      const promises = [
        requestUploadUrl({
          fileName: 'file1.pdf',
          fileSize: 1024 * 1024,
          fileType: 'application/pdf',
          courseId,
        }),
        requestUploadUrl({
          fileName: 'file2.pdf',
          fileSize: 1024 * 1024,
          fileType: 'application/pdf',
          courseId,
        }),
        requestUploadUrl({
          fileName: 'file3.pdf',
          fileSize: 1024 * 1024,
          fileType: 'application/pdf',
          courseId,
        }),
      ]

      const responses = await Promise.all(promises)

      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })
    })

    it('should handle missing optional fields gracefully', async () => {
      const response = await requestUploadUrl({
        fileName: 'test.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.status).toBe(200)
    })
  })

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      const response = await requestUploadUrl({
        fileName: 'test.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.data.success).toBe(true)
      expect(response.data.data).toHaveProperty('uploadUrl')
      expect(response.data.data).toHaveProperty('fileId')
      expect(response.data.data).toHaveProperty('storagePath')
    })

    it('should return valid file ID (CUID)', async () => {
      const response = await requestUploadUrl({
        fileName: 'test.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      const fileId = response.data.data.fileId
      expect(fileId).toMatch(/^c[a-z0-9]+$/)
    })
  })

  describe('Error Messages', () => {
    it('should provide helpful error for file too large', async () => {
      const response = await requestUploadUrl({
        fileName: 'huge.pdf',
        fileSize: 300 * 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.data.error.message).toContain('200MB')
      expect(response.data.error.message).toContain('size')
    })

    it('should provide helpful error for duplicate name', async () => {
      await prisma.file.create({
        data: {
          courseId,
          name: 'existing.pdf',
          fileSize: BigInt(1024 * 1024),
          status: 'READY',
          storagePath: 'path/to/existing.pdf',
        },
      })

      const response = await requestUploadUrl({
        fileName: 'existing.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.data.error.message).toContain('already exists')
      expect(response.data.error.message).toContain('existing.pdf')
    })

    it('should provide helpful error for storage quota', async () => {
      await prisma.file.create({
        data: {
          courseId,
          name: 'huge.pdf',
          fileSize: BigInt(FILE_LIMITS.MAX_STORAGE_PER_USER),
          status: 'READY',
          storagePath: 'path/to/huge.pdf',
        },
      })

      const response = await requestUploadUrl({
        fileName: 'new.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        courseId,
      })

      expect(response.data.error.message).toContain('5GB')
      expect(response.data.error.message).toContain('storage')
    })
  })
})
