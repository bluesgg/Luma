// =============================================================================
// READER-003: Reading Progress API Tests (TDD)
// GET /api/files/[id]/progress - Fetch current reading progress
// PATCH /api/files/[id]/progress - Update current page
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/lib/constants'

async function getProgress(fileId: string) {
  const response = await fetch(`/api/files/${fileId}/progress`, {
    method: 'GET',
  })
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  }
}

async function updateProgress(fileId: string, currentPage: number) {
  const response = await fetch(`/api/files/${fileId}/progress`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPage }),
  })
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  }
}

describe('GET /api/files/[id]/progress (READER-003)', () => {
  let userId: string
  let courseId: string
  let fileId: string

  beforeEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.file.deleteMany()
    await prisma.course.deleteMany()
    await prisma.user.deleteMany()

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
      },
    })
    courseId = course.id

    // Create test file
    const file = await prisma.file.create({
      data: {
        courseId,
        name: 'lecture.pdf',
        fileSize: BigInt(5 * 1024 * 1024),
        status: 'READY',
        storagePath: 'test/path.pdf',
        pageCount: 50,
      },
    })
    fileId = file.id
  })

  afterEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.file.deleteMany()
    await prisma.course.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Happy Path', () => {
    it('should return existing progress for user', async () => {
      // Create reading progress
      await prisma.readingProgress.create({
        data: {
          userId,
          fileId,
          currentPage: 15,
        },
      })

      const response = await getProgress(fileId)

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.currentPage).toBe(15)
    })

    it('should return default page 1 if no progress exists', async () => {
      const response = await getProgress(fileId)

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.currentPage).toBe(1)
    })

    it('should include updatedAt timestamp', async () => {
      await prisma.readingProgress.create({
        data: {
          userId,
          fileId,
          currentPage: 10,
        },
      })

      const response = await getProgress(fileId)

      expect(response.data.data.updatedAt).toBeDefined()
      expect(new Date(response.data.data.updatedAt)).toBeInstanceOf(Date)
    })

    it('should return most recent progress for user', async () => {
      await prisma.readingProgress.create({
        data: {
          userId,
          fileId,
          currentPage: 25,
        },
      })

      const response = await getProgress(fileId)

      expect(response.data.data.currentPage).toBe(25)
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests (401)', async () => {
      // Mock no session
      const response = await getProgress(fileId)

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_UNAUTHORIZED)
    })

    it('should reject unverified email users (403)', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { emailConfirmedAt: null },
      })

      const response = await getProgress(fileId)

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED)
    })
  })

  describe('Authorization', () => {
    it('should reject access to other user file (403)', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          passwordHash: '$2b$10$hashedpassword',
          emailConfirmedAt: new Date(),
          role: 'STUDENT',
        },
      })

      const otherCourse = await prisma.course.create({
        data: {
          userId: otherUser.id,
          name: 'Other Course',
        },
      })

      const otherFile = await prisma.file.create({
        data: {
          courseId: otherCourse.id,
          name: 'other.pdf',
          fileSize: BigInt(1024 * 1024),
          status: 'READY',
          storagePath: 'other/path.pdf',
        },
      })

      const response = await getProgress(otherFile.id)

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_FORBIDDEN)
    })

    it('should verify file ownership through course', async () => {
      await prisma.readingProgress.create({
        data: {
          userId,
          fileId,
          currentPage: 5,
        },
      })

      const response = await getProgress(fileId)

      expect(response.status).toBe(200)
    })
  })

  describe('Validation', () => {
    it('should reject invalid fileId format', async () => {
      const response = await getProgress('invalid-id')

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should return 404 for non-existent file', async () => {
      const response = await getProgress('cnonexistent12345')

      expect(response.status).toBe(404)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_NOT_FOUND)
    })

    it('should reject empty fileId', async () => {
      const response = await getProgress('')

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      const response = await getProgress(fileId)

      expect(response.data.success).toBe(true)
      expect(response.data.data).toHaveProperty('currentPage')
      expect(response.data.data).toHaveProperty('updatedAt')
    })

    it('should return number type for currentPage', async () => {
      const response = await getProgress(fileId)

      expect(typeof response.data.data.currentPage).toBe('number')
    })

    it('should return ISO timestamp for updatedAt', async () => {
      await prisma.readingProgress.create({
        data: {
          userId,
          fileId,
          currentPage: 10,
        },
      })

      const response = await getProgress(fileId)

      const timestamp = response.data.data.updatedAt
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('Edge Cases', () => {
    it('should handle file without pageCount', async () => {
      const fileWithoutPages = await prisma.file.create({
        data: {
          courseId,
          name: 'nopages.pdf',
          fileSize: BigInt(1024 * 1024),
          status: 'READY',
          storagePath: 'test/nopages.pdf',
          pageCount: null,
        },
      })

      const response = await getProgress(fileWithoutPages.id)

      expect(response.status).toBe(200)
      expect(response.data.data.currentPage).toBe(1)
    })

    it('should handle file in PROCESSING status', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'PROCESSING' },
      })

      const response = await getProgress(fileId)

      expect(response.status).toBe(200)
    })

    it('should handle file in FAILED status', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'FAILED' },
      })

      const response = await getProgress(fileId)

      expect(response.status).toBe(200)
    })
  })
})

describe('PATCH /api/files/[id]/progress (READER-003)', () => {
  let userId: string
  let courseId: string
  let fileId: string

  beforeEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.file.deleteMany()
    await prisma.course.deleteMany()
    await prisma.user.deleteMany()

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
      },
    })
    courseId = course.id

    // Create test file
    const file = await prisma.file.create({
      data: {
        courseId,
        name: 'lecture.pdf',
        fileSize: BigInt(5 * 1024 * 1024),
        status: 'READY',
        storagePath: 'test/path.pdf',
        pageCount: 50,
      },
    })
    fileId = file.id
  })

  afterEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.file.deleteMany()
    await prisma.course.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Happy Path', () => {
    it('should update existing progress', async () => {
      // Create initial progress
      await prisma.readingProgress.create({
        data: {
          userId,
          fileId,
          currentPage: 10,
        },
      })

      const response = await updateProgress(fileId, 25)

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.currentPage).toBe(25)
    })

    it('should create progress if none exists (upsert)', async () => {
      const response = await updateProgress(fileId, 15)

      expect(response.status).toBe(200)
      expect(response.data.data.currentPage).toBe(15)

      // Verify in database
      const progress = await prisma.readingProgress.findUnique({
        where: {
          userId_fileId: {
            userId,
            fileId,
          },
        },
      })

      expect(progress).toBeDefined()
      expect(progress?.currentPage).toBe(15)
    })

    it('should update timestamp on progress update', async () => {
      await prisma.readingProgress.create({
        data: {
          userId,
          fileId,
          currentPage: 10,
        },
      })

      const beforeTime = new Date()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const response = await updateProgress(fileId, 20)
      const afterTime = new Date()

      const updatedAt = new Date(response.data.data.updatedAt)
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })

    it('should return updated progress data', async () => {
      const response = await updateProgress(fileId, 30)

      expect(response.data.data).toHaveProperty('currentPage')
      expect(response.data.data).toHaveProperty('updatedAt')
      expect(response.data.data.currentPage).toBe(30)
    })

    it('should allow updating to page 1', async () => {
      await prisma.readingProgress.create({
        data: {
          userId,
          fileId,
          currentPage: 25,
        },
      })

      const response = await updateProgress(fileId, 1)

      expect(response.status).toBe(200)
      expect(response.data.data.currentPage).toBe(1)
    })

    it('should allow updating to last page', async () => {
      const response = await updateProgress(fileId, 50)

      expect(response.status).toBe(200)
      expect(response.data.data.currentPage).toBe(50)
    })

    it('should allow updating to page beyond pageCount', async () => {
      // Some PDFs might have dynamic page counts
      const response = await updateProgress(fileId, 500)

      expect(response.status).toBe(200)
      expect(response.data.data.currentPage).toBe(500)
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests (401)', async () => {
      // Mock no session
      const response = await updateProgress(fileId, 15)

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_UNAUTHORIZED)
    })

    it('should reject unverified email users (403)', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { emailConfirmedAt: null },
      })

      const response = await updateProgress(fileId, 15)

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED)
    })
  })

  describe('Authorization', () => {
    it('should reject updating other user file progress (403)', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          passwordHash: '$2b$10$hashedpassword',
          emailConfirmedAt: new Date(),
          role: 'STUDENT',
        },
      })

      const otherCourse = await prisma.course.create({
        data: {
          userId: otherUser.id,
          name: 'Other Course',
        },
      })

      const otherFile = await prisma.file.create({
        data: {
          courseId: otherCourse.id,
          name: 'other.pdf',
          fileSize: BigInt(1024 * 1024),
          status: 'READY',
          storagePath: 'other/path.pdf',
        },
      })

      const response = await updateProgress(otherFile.id, 10)

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_FORBIDDEN)
    })

    it('should verify file ownership through course', async () => {
      const response = await updateProgress(fileId, 15)

      expect(response.status).toBe(200)
    })
  })

  describe('Validation', () => {
    it('should reject invalid fileId format', async () => {
      const response = await updateProgress('invalid-id', 10)

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should return 404 for non-existent file', async () => {
      const response = await updateProgress('cnonexistent12345', 10)

      expect(response.status).toBe(404)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_NOT_FOUND)
    })

    it('should reject missing currentPage field', async () => {
      const response = await fetch(`/api/files/${fileId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject invalid currentPage type', async () => {
      const response = await fetch(`/api/files/${fileId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPage: 'invalid' }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject currentPage less than 1', async () => {
      const response = await updateProgress(fileId, 0)

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject negative currentPage', async () => {
      const response = await updateProgress(fileId, -5)

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject decimal currentPage', async () => {
      const response = await fetch(`/api/files/${fileId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPage: 10.5 }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject currentPage greater than 500', async () => {
      const response = await updateProgress(fileId, 501)

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('Upsert Behavior', () => {
    it('should create new record on first update', async () => {
      const response = await updateProgress(fileId, 10)

      expect(response.status).toBe(200)

      const progress = await prisma.readingProgress.findUnique({
        where: {
          userId_fileId: {
            userId,
            fileId,
          },
        },
      })

      expect(progress).toBeDefined()
      expect(progress?.currentPage).toBe(10)
    })

    it('should not create duplicate records', async () => {
      await updateProgress(fileId, 5)
      await updateProgress(fileId, 10)
      await updateProgress(fileId, 15)

      const progressRecords = await prisma.readingProgress.findMany({
        where: {
          userId,
          fileId,
        },
      })

      expect(progressRecords).toHaveLength(1)
      expect(progressRecords[0].currentPage).toBe(15)
    })

    it('should maintain unique constraint per user-file pair', async () => {
      const anotherUser = await prisma.user.create({
        data: {
          email: 'another@example.com',
          passwordHash: '$2b$10$hashedpassword',
          emailConfirmedAt: new Date(),
          role: 'STUDENT',
        },
      })

      // First user's progress
      await updateProgress(fileId, 10)

      // Mock second user's session and update progress
      // (In real implementation, this would use second user's session)
      await prisma.readingProgress.create({
        data: {
          userId: anotherUser.id,
          fileId,
          currentPage: 20,
        },
      })

      const progressRecords = await prisma.readingProgress.findMany({
        where: { fileId },
      })

      expect(progressRecords).toHaveLength(2)
    })
  })

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      const response = await updateProgress(fileId, 15)

      expect(response.data.success).toBe(true)
      expect(response.data.data).toHaveProperty('currentPage')
      expect(response.data.data).toHaveProperty('updatedAt')
    })

    it('should return number type for currentPage', async () => {
      const response = await updateProgress(fileId, 15)

      expect(typeof response.data.data.currentPage).toBe('number')
    })

    it('should return ISO timestamp for updatedAt', async () => {
      const response = await updateProgress(fileId, 15)

      const timestamp = response.data.data.updatedAt
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid successive updates', async () => {
      const updates = [1, 2, 3, 4, 5]

      for (const page of updates) {
        await updateProgress(fileId, page)
      }

      const progress = await prisma.readingProgress.findUnique({
        where: {
          userId_fileId: {
            userId,
            fileId,
          },
        },
      })

      expect(progress?.currentPage).toBe(5)
    })

    it('should handle concurrent update requests', async () => {
      const promises = [
        updateProgress(fileId, 10),
        updateProgress(fileId, 20),
        updateProgress(fileId, 30),
      ]

      const responses = await Promise.all(promises)

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })

      // Final progress should be one of the values
      const progress = await prisma.readingProgress.findUnique({
        where: {
          userId_fileId: {
            userId,
            fileId,
          },
        },
      })

      expect([10, 20, 30]).toContain(progress?.currentPage)
    })

    it('should handle updating same page multiple times', async () => {
      await updateProgress(fileId, 15)
      await updateProgress(fileId, 15)
      const response = await updateProgress(fileId, 15)

      expect(response.status).toBe(200)
      expect(response.data.data.currentPage).toBe(15)
    })

    it('should handle file without pageCount', async () => {
      const fileWithoutPages = await prisma.file.create({
        data: {
          courseId,
          name: 'nopages.pdf',
          fileSize: BigInt(1024 * 1024),
          status: 'READY',
          storagePath: 'test/nopages.pdf',
          pageCount: null,
        },
      })

      const response = await updateProgress(fileWithoutPages.id, 10)

      expect(response.status).toBe(200)
      expect(response.data.data.currentPage).toBe(10)
    })
  })

  describe('Malformed Requests', () => {
    it('should reject empty request body', async () => {
      const response = await fetch(`/api/files/${fileId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '',
      })

      expect(response.status).toBe(400)
    })

    it('should reject malformed JSON', async () => {
      const response = await fetch(`/api/files/${fileId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{invalid json}',
      })

      expect(response.status).toBe(400)
    })

    it('should reject null currentPage', async () => {
      const response = await fetch(`/api/files/${fileId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPage: null }),
      })

      expect(response.status).toBe(400)
    })

    it('should ignore extra fields in request', async () => {
      const response = await fetch(`/api/files/${fileId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPage: 15,
          extraField: 'ignored',
          anotherField: 123,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.currentPage).toBe(15)
    })
  })
})
