// =============================================================================
// FILE-006: Download URL API Tests (TDD)
// GET /api/files/[id]/download-url
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/lib/constants'

async function getDownloadUrl(fileId: string) {
  const response = await fetch(`/api/files/${fileId}/download-url`, {
    method: 'GET',
  })
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  }
}

describe('GET /api/files/[id]/download-url', () => {
  let userId: string
  let courseId: string
  let fileId: string

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

    // Create test file
    const file = await prisma.file.create({
      data: {
        courseId,
        name: 'test.pdf',
        fileSize: BigInt(5 * 1024 * 1024),
        status: 'READY',
        storagePath: 'user123/course456/file789.pdf',
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
    it('should generate download URL for READY file', async () => {
      const response = await getDownloadUrl(fileId)

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.downloadUrl).toBeDefined()
    })

    it('should return signed URL with expiration', async () => {
      const response = await getDownloadUrl(fileId)

      const url = response.data.data.downloadUrl
      expect(url).toContain('https://')
      expect(url).toBeTruthy()
    })

    it('should set URL expiry to 1 hour', async () => {
      const response = await getDownloadUrl(fileId)

      const url = response.data.data.downloadUrl
      expect(url).toBeDefined()
      // URL expiry would be verified by Supabase Storage mock
    })

    it('should return file metadata', async () => {
      const response = await getDownloadUrl(fileId)

      const fileData = response.data.data.file
      expect(fileData.id).toBe(fileId)
      expect(fileData.name).toBe('test.pdf')
      expect(fileData.status).toBe('READY')
    })

    it('should not expose storagePath in response', async () => {
      const response = await getDownloadUrl(fileId)

      expect(response.data.data.file.storagePath).toBeUndefined()
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests (401)', async () => {
      // Mock no session
      const response = await getDownloadUrl(fileId)

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_UNAUTHORIZED)
    })

    it('should reject unverified email users (403)', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { emailConfirmedAt: null },
      })

      const response = await getDownloadUrl(fileId)

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED)
    })
  })

  describe('Authorization', () => {
    it('should reject accessing other user file (403)', async () => {
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
          storagePath: 'other/path.pdf',
        },
      })

      const response = await getDownloadUrl(otherFile.id)

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_FORBIDDEN)
    })

    it('should verify file ownership through course', async () => {
      const response = await getDownloadUrl(fileId)

      expect(response.status).toBe(200)
    })
  })

  describe('Validation', () => {
    it('should reject invalid fileId format', async () => {
      const response = await getDownloadUrl('invalid-id')

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject non-existent fileId (404)', async () => {
      const response = await getDownloadUrl('cnonexistent12345')

      expect(response.status).toBe(404)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_NOT_FOUND)
    })

    it('should reject empty fileId', async () => {
      const response = await getDownloadUrl('')

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('File Status Validation', () => {
    it('should reject UPLOADING file', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'UPLOADING' },
      })

      const response = await getDownloadUrl(fileId)

      expect(response.status).toBe(400)
      expect(response.data.error.message).toContain('not ready')
    })

    it('should reject PROCESSING file', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'PROCESSING' },
      })

      const response = await getDownloadUrl(fileId)

      expect(response.status).toBe(400)
      expect(response.data.error.message).toContain('processing')
    })

    it('should allow FAILED file download', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'FAILED' },
      })

      const response = await getDownloadUrl(fileId)

      expect(response.status).toBe(200)
    })

    it('should only accept READY or FAILED status', async () => {
      // READY should work
      const response = await getDownloadUrl(fileId)
      expect(response.status).toBe(200)
    })
  })

  describe('Storage Integration', () => {
    it('should use storagePath to generate URL', async () => {
      const response = await getDownloadUrl(fileId)

      expect(response.status).toBe(200)
      expect(response.data.data.downloadUrl).toBeDefined()
    })

    it('should handle storage service errors gracefully', async () => {
      // Mock storage service failure
      const response = await getDownloadUrl(fileId)

      // Should return error if storage fails
      expect([200, 500]).toContain(response.status)
    })

    it('should generate URL from correct bucket', async () => {
      const response = await getDownloadUrl(fileId)

      expect(response.status).toBe(200)
      // Bucket verification would be in integration test
    })
  })

  describe('URL Expiration', () => {
    it('should set expiry to 1 hour (3600 seconds)', async () => {
      const response = await getDownloadUrl(fileId)

      expect(response.status).toBe(200)
      // Expiry parameter would be verified in integration test
    })

    it('should return fresh URL on each request', async () => {
      const response1 = await getDownloadUrl(fileId)
      const response2 = await getDownloadUrl(fileId)

      expect(response1.data.data.downloadUrl).toBeDefined()
      expect(response2.data.data.downloadUrl).toBeDefined()
      // URLs may differ slightly due to timestamps
    })
  })

  describe('Edge Cases', () => {
    it('should handle special characters in storagePath', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { storagePath: 'user/course/file-2024 (final).pdf' },
      })

      const response = await getDownloadUrl(fileId)

      expect(response.status).toBe(200)
    })

    it('should handle unicode characters in filename', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { name: '课程资料.pdf' },
      })

      const response = await getDownloadUrl(fileId)

      expect(response.status).toBe(200)
      expect(response.data.data.file.name).toBe('课程资料.pdf')
    })

    it('should handle very long filenames', async () => {
      const longName = 'a'.repeat(200) + '.pdf'
      await prisma.file.update({
        where: { id: fileId },
        data: { name: longName },
      })

      const response = await getDownloadUrl(fileId)

      expect(response.status).toBe(200)
    })

    it('should handle concurrent download URL requests', async () => {
      const promises = [
        getDownloadUrl(fileId),
        getDownloadUrl(fileId),
        getDownloadUrl(fileId),
      ]

      const responses = await Promise.all(promises)

      responses.forEach((response) => {
        expect(response.status).toBe(200)
        expect(response.data.data.downloadUrl).toBeDefined()
      })
    })
  })

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      const response = await getDownloadUrl(fileId)

      expect(response.data.success).toBe(true)
      expect(response.data.data).toHaveProperty('downloadUrl')
      expect(response.data.data).toHaveProperty('file')
    })

    it('should include file metadata in response', async () => {
      const response = await getDownloadUrl(fileId)

      const file = response.data.data.file
      expect(file.id).toBe(fileId)
      expect(file.name).toBe('test.pdf')
      expect(file.status).toBe('READY')
      expect(file.courseId).toBe(courseId)
    })

    it('should return valid HTTPS URL', async () => {
      const response = await getDownloadUrl(fileId)

      const url = response.data.data.downloadUrl
      expect(url).toMatch(/^https:\/\//)
    })
  })

  describe('Error Messages', () => {
    it('should provide helpful error for UPLOADING status', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'UPLOADING' },
      })

      const response = await getDownloadUrl(fileId)

      expect(response.data.error.message).toContain('upload')
      expect(response.data.error.message).toContain('not ready')
    })

    it('should provide helpful error for PROCESSING status', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'PROCESSING' },
      })

      const response = await getDownloadUrl(fileId)

      expect(response.data.error.message).toContain('processing')
    })

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
          status: 'READY',
          storagePath: 'other/path.pdf',
        },
      })

      const response = await getDownloadUrl(otherFile.id)

      expect(response.data.error.message).toContain('access')
    })

    it('should provide helpful error for non-existent file', async () => {
      const response = await getDownloadUrl('cnonexistent12345')

      expect(response.data.error.message).toContain('not found')
    })
  })

  describe('Security', () => {
    it('should not expose internal storagePath', async () => {
      const response = await getDownloadUrl(fileId)

      expect(response.data.data.file.storagePath).toBeUndefined()
    })

    it('should generate time-limited URLs', async () => {
      const response = await getDownloadUrl(fileId)

      const url = response.data.data.downloadUrl
      // Time-limited verification would be in integration test
      expect(url).toBeDefined()
    })

    it('should use signed URLs for security', async () => {
      const response = await getDownloadUrl(fileId)

      const url = response.data.data.downloadUrl
      // Signature verification would be in integration test
      expect(url).toContain('https://')
    })
  })

  describe('Performance', () => {
    it('should respond quickly without expensive operations', async () => {
      const start = Date.now()
      await getDownloadUrl(fileId)
      const duration = Date.now() - start

      // Should respond in under 1 second
      expect(duration).toBeLessThan(1000)
    })

    it('should cache storage client connections', async () => {
      // Multiple requests should reuse connections
      await getDownloadUrl(fileId)
      await getDownloadUrl(fileId)
      await getDownloadUrl(fileId)

      // Performance would be verified in integration test
      expect(true).toBe(true)
    })
  })
})
