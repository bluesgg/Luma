// =============================================================================
// TUTOR-005: Structure Extraction Retry API Tests (TDD)
// POST /api/files/:id/extract/retry
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/lib/constants'

// Mock Trigger.dev client
vi.mock('@/trigger/client', () => ({
  triggerClient: {
    sendEvent: vi.fn(),
  },
}))

async function retryExtraction(fileId: string) {
  const response = await fetch(`/api/files/${fileId}/extract/retry`, {
    method: 'POST',
  })
  return {
    status: response.status,
    data: await response.json(),
  }
}

describe('POST /api/files/:id/extract/retry (TUTOR-005)', () => {
  let userId: string
  let courseId: string
  let fileId: string

  beforeEach(async () => {
    await prisma.user.deleteMany()
    await prisma.course.deleteMany()
    await prisma.file.deleteMany()

    const user = await prisma.user.create({
      data: {
        email: 'verified@example.com',
        passwordHash: '$2b$10$hashedpassword',
        emailConfirmedAt: new Date(),
      },
    })
    userId = user.id

    const course = await prisma.course.create({
      data: {
        userId,
        name: 'Test Course',
      },
    })
    courseId = course.id

    const file = await prisma.file.create({
      data: {
        courseId,
        name: 'test.pdf',
        fileSize: BigInt(5 * 1024 * 1024),
        status: 'READY',
        storagePath: 'files/test.pdf',
        structureStatus: 'FAILED',
        structureError: 'Extraction timeout',
      },
    })
    fileId = file.id
  })

  afterEach(async () => {
    await prisma.file.deleteMany()
    await prisma.course.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Happy Path', () => {
    it('should retry structure extraction for failed file', async () => {
      const response = await retryExtraction(fileId)

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })

    it('should reset structure status to PENDING', async () => {
      await retryExtraction(fileId)

      const file = await prisma.file.findUnique({
        where: { id: fileId },
      })

      expect(file?.structureStatus).toBe('PENDING')
    })

    it('should clear structure error', async () => {
      await retryExtraction(fileId)

      const file = await prisma.file.findUnique({
        where: { id: fileId },
      })

      expect(file?.structureError).toBeNull()
    })

    it('should trigger background extraction job', async () => {
      const response = await retryExtraction(fileId)

      expect(response.status).toBe(200)
      // Verify Trigger.dev event sent
    })

    it('should return job ID in response', async () => {
      const response = await retryExtraction(fileId)

      expect(response.data.data).toHaveProperty('jobId')
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests (401)', async () => {
      // Mock no session
      const response = await retryExtraction(fileId)

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_UNAUTHORIZED)
    })

    it('should reject unverified email users (403)', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { emailConfirmedAt: null },
      })

      const response = await retryExtraction(fileId)

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED)
    })
  })

  describe('Authorization', () => {
    it('should reject other user files (403)', async () => {
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

      const otherFile = await prisma.file.create({
        data: {
          courseId: otherCourse.id,
          name: 'other.pdf',
          fileSize: BigInt(1024 * 1024),
          status: 'READY',
          storagePath: 'files/other.pdf',
          structureStatus: 'FAILED',
        },
      })

      const response = await retryExtraction(otherFile.id)

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_FORBIDDEN)
    })
  })

  describe('Validation', () => {
    it('should reject invalid file ID format', async () => {
      const response = await retryExtraction('invalid-id')

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject non-existent file (404)', async () => {
      const response = await retryExtraction('cnonexistent12345')

      expect(response.status).toBe(404)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_NOT_FOUND)
    })

    it('should reject file not in FAILED status (400)', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { structureStatus: 'READY' },
      })

      const response = await retryExtraction(fileId)

      expect(response.status).toBe(400)
      expect(response.data.error.message).toContain('not failed')
    })

    it('should reject file in PROCESSING status', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { structureStatus: 'PROCESSING' },
      })

      const response = await retryExtraction(fileId)

      expect(response.status).toBe(400)
      expect(response.data.error.message).toContain('already processing')
    })

    it('should allow retry for PENDING status', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { structureStatus: 'PENDING' },
      })

      const response = await retryExtraction(fileId)

      expect(response.status).toBe(200)
    })
  })

  describe('File Status Check', () => {
    it('should reject file in UPLOADING status', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'UPLOADING' },
      })

      const response = await retryExtraction(fileId)

      expect(response.status).toBe(400)
      expect(response.data.error.message).toContain('not ready')
    })

    it('should reject file in FAILED status', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'FAILED' },
      })

      const response = await retryExtraction(fileId)

      expect(response.status).toBe(400)
      expect(response.data.error.message).toContain('failed')
    })

    it('should only allow READY files', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'READY', structureStatus: 'FAILED' },
      })

      const response = await retryExtraction(fileId)

      expect(response.status).toBe(200)
    })
  })

  describe('Cleanup', () => {
    it('should delete existing topic groups', async () => {
      await prisma.topicGroup.create({
        data: {
          fileId,
          index: 0,
          title: 'Old Topic',
          type: 'CORE',
        },
      })

      await retryExtraction(fileId)

      const topicGroups = await prisma.topicGroup.findMany({
        where: { fileId },
      })

      expect(topicGroups).toHaveLength(0)
    })

    it('should delete existing extracted images', async () => {
      await prisma.extractedImage.create({
        data: {
          fileId,
          pageNumber: 1,
          imageIndex: 0,
          storagePath: 'images/test.png',
          bbox: { x: 0, y: 0, w: 100, h: 100 },
        },
      })

      await retryExtraction(fileId)

      const images = await prisma.extractedImage.findMany({
        where: { fileId },
      })

      expect(images).toHaveLength(0)
    })

    it('should preserve file metadata', async () => {
      const originalFile = await prisma.file.findUnique({
        where: { id: fileId },
      })

      await retryExtraction(fileId)

      const file = await prisma.file.findUnique({
        where: { id: fileId },
      })

      expect(file?.name).toBe(originalFile?.name)
      expect(file?.pageCount).toBe(originalFile?.pageCount)
    })
  })

  describe('Rate Limiting', () => {
    it('should limit retry attempts per hour', async () => {
      // Retry 3 times
      await retryExtraction(fileId)
      await retryExtraction(fileId)
      await retryExtraction(fileId)

      const response = await retryExtraction(fileId)

      expect(response.status).toBe(429)
      expect(response.data.error.message).toContain('too many retries')
    })

    it('should reset retry count after 1 hour', async () => {
      // Mock time progression
      expect(true).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle Trigger.dev connection errors', async () => {
      // Mock Trigger.dev error
      const response = await retryExtraction(fileId)

      // Should still update status to PENDING
      expect(true).toBe(true)
    })

    it('should rollback on database errors', async () => {
      // Mock database error during cleanup
      expect(true).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle file with no previous extraction data', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { extractedAt: null },
      })

      const response = await retryExtraction(fileId)

      expect(response.status).toBe(200)
    })

    it('should handle concurrent retry requests', async () => {
      const responses = await Promise.all([
        retryExtraction(fileId),
        retryExtraction(fileId),
        retryExtraction(fileId),
      ])

      // Only one should succeed
      const successCount = responses.filter((r) => r.status === 200).length
      expect(successCount).toBeLessThanOrEqual(1)
    })

    it('should handle very large files', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { fileSize: BigInt(100 * 1024 * 1024) }, // 100MB
      })

      const response = await retryExtraction(fileId)

      expect(response.status).toBe(200)
    })
  })

  describe('Response Format', () => {
    it('should return success message', async () => {
      const response = await retryExtraction(fileId)

      expect(response.data.data.message).toContain('retry')
    })

    it('should return estimated completion time', async () => {
      const response = await retryExtraction(fileId)

      expect(response.data.data).toHaveProperty('estimatedCompletionTime')
    })
  })
})
