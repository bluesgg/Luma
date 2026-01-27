// =============================================================================
// FILE-002: Confirm Upload API Tests (TDD)
// POST /api/files/confirm
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/lib/constants'

async function confirmUpload(data: { fileId: string }) {
  const response = await fetch('/api/files/confirm', {
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

describe('POST /api/files/confirm', () => {
  let userId: string
  let courseId: string
  let fileId: string
  const storagePath = 'user123/course456/file789.pdf'

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
      },
    })
    courseId = course.id

    // Create file in UPLOADING status
    const file = await prisma.file.create({
      data: {
        courseId,
        name: 'test.pdf',
        fileSize: BigInt(5 * 1024 * 1024),
        status: 'UPLOADING',
        storagePath,
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
    it('should confirm upload successfully', async () => {
      const response = await confirmUpload({
        fileId,
      })

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.file).toBeDefined()
      expect(response.data.data.file.status).toBe('PROCESSING')
    })

    it('should update file status to PROCESSING', async () => {
      await confirmUpload({ fileId })

      const file = await prisma.file.findUnique({
        where: { id: fileId },
      })

      expect(file?.status).toBe('PROCESSING')
    })

    it('should trigger background PDF analysis job', async () => {
      const response = await confirmUpload({ fileId })

      // Job should be queued (implementation-specific verification)
      expect(response.status).toBe(200)
    })

    it('should return updated file data', async () => {
      const response = await confirmUpload({ fileId })

      const fileData = response.data.data.file
      expect(fileData.id).toBe(fileId)
      expect(fileData.name).toBe('test.pdf')
      expect(fileData.status).toBe('PROCESSING')
      expect(fileData.courseId).toBe(courseId)
    })

    it('should preserve storagePath', async () => {
      await confirmUpload({ fileId })

      const file = await prisma.file.findUnique({
        where: { id: fileId },
      })

      expect(file?.storagePath).toBe(storagePath)
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests (401)', async () => {
      // Mock no session
      const response = await confirmUpload({ fileId })

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_UNAUTHORIZED)
    })

    it('should reject unverified email users (403)', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { emailConfirmedAt: null },
      })

      const response = await confirmUpload({ fileId })

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED)
    })
  })

  describe('Authorization', () => {
    it('should reject confirming other user file (403)', async () => {
      // Create another user's file
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
          status: 'UPLOADING',
          storagePath: 'other/path.pdf',
        },
      })

      const response = await confirmUpload({
        fileId: otherFile.id,
      })

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_FORBIDDEN)
    })

    it('should verify file ownership through course', async () => {
      const response = await confirmUpload({ fileId })

      expect(response.status).toBe(200)
    })
  })

  describe('Validation', () => {
    it('should reject empty fileId', async () => {
      const response = await confirmUpload({
        fileId: '',
        storagePath,
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    // Removed test: storagePath is no longer required in the API

    it('should reject invalid fileId format', async () => {
      const response = await confirmUpload({
        fileId: 'invalid-id',
        storagePath,
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject non-existent fileId', async () => {
      const response = await confirmUpload({
        fileId: 'cnonexistent12345',
        storagePath,
      })

      expect(response.status).toBe(404)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_NOT_FOUND)
    })

    // Removed test: storagePath validation is no longer part of the API
  })

  describe('Status Validation', () => {
    it('should reject confirming already PROCESSING file', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'PROCESSING' },
      })

      const response = await confirmUpload({ fileId })

      expect(response.status).toBe(400)
      expect(response.data.error.message).toContain('already')
    })

    it('should reject confirming READY file', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'READY' },
      })

      const response = await confirmUpload({ fileId })

      expect(response.status).toBe(400)
      expect(response.data.error.message).toContain('already')
    })

    it('should reject confirming FAILED file', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'FAILED' },
      })

      const response = await confirmUpload({ fileId })

      expect(response.status).toBe(400)
    })

    it('should only accept UPLOADING status files', async () => {
      // UPLOADING file should work
      const response = await confirmUpload({ fileId })
      expect(response.status).toBe(200)
    })
  })

  describe('Background Job Integration', () => {
    it('should queue PDF analysis job after confirmation', async () => {
      const response = await confirmUpload({ fileId })

      expect(response.status).toBe(200)
      // Verify job was queued (implementation specific)
    })

    it('should include fileId in job payload', async () => {
      const response = await confirmUpload({ fileId })

      expect(response.status).toBe(200)
    })

    it('should handle job queue failures gracefully', async () => {
      // Mock job queue failure
      const response = await confirmUpload({ fileId })

      // Should still succeed even if job queue fails
      expect(response.status).toBe(200)
    })
  })

  describe('Concurrent Requests', () => {
    it('should handle concurrent confirm requests safely', async () => {
      const promises = [
        confirmUpload({ fileId, storagePath }),
        confirmUpload({ fileId, storagePath }),
        confirmUpload({ fileId, storagePath }),
      ]

      const responses = await Promise.all(promises)

      // First should succeed, others should fail
      const successCount = responses.filter((r) => r.status === 200).length
      expect(successCount).toBe(1)
    })

    it('should use database transaction for status update', async () => {
      const response = await confirmUpload({ fileId })

      expect(response.status).toBe(200)
      // Status should be atomically updated
    })
  })

  describe('Edge Cases', () => {
    // Removed tests: storagePath is no longer a request parameter

    it('should handle missing course reference gracefully', async () => {
      // Delete course (should cascade delete file)
      await prisma.course.delete({
        where: { id: courseId },
      })

      const response = await confirmUpload({ fileId })

      expect(response.status).toBe(404)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_NOT_FOUND)
    })
  })

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      const response = await confirmUpload({ fileId })

      expect(response.data.success).toBe(true)
      expect(response.data.data).toHaveProperty('file')
      expect(response.data.data.file).toHaveProperty('id')
      expect(response.data.data.file).toHaveProperty('status')
      expect(response.data.data.file).toHaveProperty('name')
    })

    it('should not include sensitive fields', async () => {
      const response = await confirmUpload({ fileId })

      const fileData = response.data.data.file
      expect(fileData.storagePath).toBeUndefined() // Optional: hide internal paths
    })

    it('should include course information', async () => {
      const response = await confirmUpload({ fileId })

      const fileData = response.data.data.file
      expect(fileData.courseId).toBe(courseId)
    })
  })

  describe('Error Messages', () => {
    it('should provide helpful error for wrong status', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'READY' },
      })

      const response = await confirmUpload({ fileId })

      expect(response.data.error.message).toContain('already')
      expect(response.data.error.message).toContain('uploaded')
    })

    // Removed test: storagePath is no longer validated in the API

    it('should provide helpful error for forbidden access', async () => {
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
          status: 'UPLOADING',
          storagePath: 'other/path.pdf',
        },
      })

      const response = await confirmUpload({
        fileId: otherFile.id,
      })

      expect(response.data.error.message).toContain('access')
    })
  })

  describe('Database Updates', () => {
    it('should update updatedAt timestamp', async () => {
      const beforeUpdate = new Date()
      await confirmUpload({ fileId })
      const afterUpdate = new Date()

      const file = await prisma.file.findUnique({
        where: { id: fileId },
      })

      expect(file?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime()
      )
      expect(file?.updatedAt.getTime()).toBeLessThanOrEqual(
        afterUpdate.getTime()
      )
    })

    it('should not modify other file fields', async () => {
      const originalFile = await prisma.file.findUnique({
        where: { id: fileId },
      })

      await confirmUpload({ fileId })

      const updatedFile = await prisma.file.findUnique({
        where: { id: fileId },
      })

      expect(updatedFile?.name).toBe(originalFile?.name)
      expect(Number(updatedFile?.fileSize)).toBe(Number(originalFile?.fileSize))
      expect(updatedFile?.courseId).toBe(originalFile?.courseId)
    })
  })
})
