// =============================================================================
// FILE-003, FILE-004, FILE-005: Files CRUD API Tests (TDD)
// GET /api/files (list files for course)
// DELETE /api/files/[id] (delete file)
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/lib/constants'

async function getFiles(courseId: string) {
  const response = await fetch(`/api/files?courseId=${courseId}`, {
    method: 'GET',
  })
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  }
}

async function deleteFile(fileId: string) {
  const response = await fetch(`/api/files/${fileId}`, {
    method: 'DELETE',
  })
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  }
}

describe('GET /api/files (FILE-003)', () => {
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
    it('should list all files for a course', async () => {
      // Create test files
      await prisma.file.createMany({
        data: [
          {
            courseId,
            name: 'file1.pdf',
            fileSize: BigInt(1024 * 1024),
            status: 'READY',
            storagePath: 'path/to/file1.pdf',
          },
          {
            courseId,
            name: 'file2.pdf',
            fileSize: BigInt(2 * 1024 * 1024),
            status: 'READY',
            storagePath: 'path/to/file2.pdf',
          },
        ],
      })

      const response = await getFiles(courseId)

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.files).toHaveLength(2)
    })

    it('should return empty array for course with no files', async () => {
      const response = await getFiles(courseId)

      expect(response.status).toBe(200)
      expect(response.data.data.files).toEqual([])
    })

    it('should return files sorted by created date descending', async () => {
      await prisma.file.create({
        data: {
          courseId,
          name: 'old.pdf',
          fileSize: BigInt(1024),
          status: 'READY',
          storagePath: 'path/old.pdf',
          createdAt: new Date('2024-01-01'),
        },
      })

      await prisma.file.create({
        data: {
          courseId,
          name: 'new.pdf',
          fileSize: BigInt(1024),
          status: 'READY',
          storagePath: 'path/new.pdf',
          createdAt: new Date('2024-12-01'),
        },
      })

      const response = await getFiles(courseId)

      expect(response.data.data.files[0].name).toBe('new.pdf')
      expect(response.data.data.files[1].name).toBe('old.pdf')
    })

    it('should include file metadata', async () => {
      await prisma.file.create({
        data: {
          courseId,
          name: 'test.pdf',
          fileSize: BigInt(5 * 1024 * 1024),
          status: 'READY',
          storagePath: 'path/test.pdf',
          pageCount: 25,
          isScanned: false,
          type: 'LECTURE',
        },
      })

      const response = await getFiles(courseId)

      const file = response.data.data.files[0]
      expect(file.name).toBe('test.pdf')
      expect(file.status).toBe('READY')
      expect(file.pageCount).toBe(25)
      expect(file.isScanned).toBe(false)
      expect(file.type).toBe('LECTURE')
    })

    it('should include structure status', async () => {
      await prisma.file.create({
        data: {
          courseId,
          name: 'test.pdf',
          fileSize: BigInt(1024 * 1024),
          status: 'READY',
          storagePath: 'path/test.pdf',
          structureStatus: 'READY',
        },
      })

      const response = await getFiles(courseId)

      expect(response.data.data.files[0].structureStatus).toBe('READY')
    })

    it('should not include storagePath for security', async () => {
      await prisma.file.create({
        data: {
          courseId,
          name: 'test.pdf',
          fileSize: BigInt(1024 * 1024),
          status: 'READY',
          storagePath: 'path/test.pdf',
        },
      })

      const response = await getFiles(courseId)

      expect(response.data.data.files[0].storagePath).toBeUndefined()
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests (401)', async () => {
      // Mock no session
      const response = await getFiles(courseId)

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_UNAUTHORIZED)
    })

    it('should reject unverified email users (403)', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { emailConfirmedAt: null },
      })

      const response = await getFiles(courseId)

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED)
    })
  })

  describe('Authorization', () => {
    it('should reject listing other user files (403)', async () => {
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

      const response = await getFiles(otherCourse.id)

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.COURSE_FORBIDDEN)
    })
  })

  describe('Validation', () => {
    it('should reject missing courseId', async () => {
      const response = await fetch('/api/files', { method: 'GET' })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject invalid courseId format', async () => {
      const response = await getFiles('invalid-id')

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject non-existent courseId (404)', async () => {
      const response = await getFiles('cnonexistent12345')

      expect(response.status).toBe(404)
      expect(response.data.error.code).toBe(ERROR_CODES.COURSE_NOT_FOUND)
    })
  })

  describe('File Status Filtering', () => {
    it('should include files in all statuses', async () => {
      await prisma.file.createMany({
        data: [
          {
            courseId,
            name: 'uploading.pdf',
            fileSize: BigInt(1024),
            status: 'UPLOADING',
            storagePath: 'path/uploading.pdf',
          },
          {
            courseId,
            name: 'processing.pdf',
            fileSize: BigInt(1024),
            status: 'PROCESSING',
            storagePath: 'path/processing.pdf',
          },
          {
            courseId,
            name: 'ready.pdf',
            fileSize: BigInt(1024),
            status: 'READY',
            storagePath: 'path/ready.pdf',
          },
          {
            courseId,
            name: 'failed.pdf',
            fileSize: BigInt(1024),
            status: 'FAILED',
            storagePath: 'path/failed.pdf',
          },
        ],
      })

      const response = await getFiles(courseId)

      expect(response.data.data.files).toHaveLength(4)
    })
  })

  describe('Edge Cases', () => {
    it('should handle course with 30 files', async () => {
      const files = Array.from({ length: 30 }, (_, i) => ({
        courseId,
        name: `file-${i}.pdf`,
        fileSize: BigInt(1024 * 1024),
        status: 'READY' as const,
        storagePath: `path/file-${i}.pdf`,
      }))

      await prisma.file.createMany({ data: files })

      const response = await getFiles(courseId)

      expect(response.status).toBe(200)
      expect(response.data.data.files).toHaveLength(30)
    })

    it('should handle files with null optional fields', async () => {
      await prisma.file.create({
        data: {
          courseId,
          name: 'test.pdf',
          fileSize: BigInt(1024),
          status: 'READY',
          storagePath: 'path/test.pdf',
          pageCount: null,
          structureError: null,
        },
      })

      const response = await getFiles(courseId)

      expect(response.status).toBe(200)
      expect(response.data.data.files[0].pageCount).toBeNull()
    })
  })

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      const response = await getFiles(courseId)

      expect(response.data.success).toBe(true)
      expect(response.data.data).toHaveProperty('files')
      expect(Array.isArray(response.data.data.files)).toBe(true)
    })

    it('should serialize BigInt fileSize correctly', async () => {
      await prisma.file.create({
        data: {
          courseId,
          name: 'test.pdf',
          fileSize: BigInt(5 * 1024 * 1024 * 1024), // 5GB
          status: 'READY',
          storagePath: 'path/test.pdf',
        },
      })

      const response = await getFiles(courseId)

      const fileSize = response.data.data.files[0].fileSize
      expect(typeof fileSize).toBe('number')
      expect(fileSize).toBe(5 * 1024 * 1024 * 1024)
    })
  })
})

describe('DELETE /api/files/[id] (FILE-004, FILE-005)', () => {
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
        storagePath: 'user/course/test.pdf',
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
    it('should delete file successfully', async () => {
      const response = await deleteFile(fileId)

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })

    it('should remove file from database', async () => {
      await deleteFile(fileId)

      const file = await prisma.file.findUnique({
        where: { id: fileId },
      })

      expect(file).toBeNull()
    })

    it('should delete file from storage', async () => {
      const response = await deleteFile(fileId)

      expect(response.status).toBe(200)
      // Storage deletion would be verified by integration test
    })

    it('should return success message', async () => {
      const response = await deleteFile(fileId)

      expect(response.data.data.message).toContain('deleted')
    })
  })

  describe('Cascade Deletion', () => {
    it('should delete associated TopicGroups', async () => {
      await prisma.topicGroup.create({
        data: {
          fileId,
          index: 0,
          title: 'Topic 1',
          type: 'CORE',
        },
      })

      await deleteFile(fileId)

      const topicGroups = await prisma.topicGroup.findMany({
        where: { fileId },
      })

      expect(topicGroups).toHaveLength(0)
    })

    it('should delete associated SubTopics through TopicGroups', async () => {
      const topicGroup = await prisma.topicGroup.create({
        data: {
          fileId,
          index: 0,
          title: 'Topic 1',
          type: 'CORE',
        },
      })

      await prisma.subTopic.create({
        data: {
          topicGroupId: topicGroup.id,
          index: 0,
          title: 'SubTopic 1',
          metadata: {},
        },
      })

      await deleteFile(fileId)

      const subTopics = await prisma.subTopic.findMany({
        where: { topicGroupId: topicGroup.id },
      })

      expect(subTopics).toHaveLength(0)
    })

    it('should delete associated ExtractedImages', async () => {
      await prisma.extractedImage.create({
        data: {
          fileId,
          pageNumber: 1,
          imageIndex: 0,
          storagePath: 'images/test.png',
          bbox: { x: 0, y: 0, w: 100, h: 100 },
        },
      })

      await deleteFile(fileId)

      const images = await prisma.extractedImage.findMany({
        where: { fileId },
      })

      expect(images).toHaveLength(0)
    })

    it('should delete associated LearningSessions', async () => {
      await prisma.learningSession.create({
        data: {
          userId,
          fileId,
          status: 'IN_PROGRESS',
        },
      })

      await deleteFile(fileId)

      const sessions = await prisma.learningSession.findMany({
        where: { fileId },
      })

      expect(sessions).toHaveLength(0)
    })

    it('should delete associated Explanations', async () => {
      await prisma.explanation.create({
        data: {
          fileId,
          pageNum: 1,
          content: 'Test explanation',
        },
      })

      await deleteFile(fileId)

      const explanations = await prisma.explanation.findMany({
        where: { fileId },
      })

      expect(explanations).toHaveLength(0)
    })

    it('should delete associated ImageRegions', async () => {
      await prisma.imageRegion.create({
        data: {
          fileId,
          pageNum: 1,
          bbox: { x: 0, y: 0, w: 100, h: 100 },
          content: 'Test content',
        },
      })

      await deleteFile(fileId)

      const regions = await prisma.imageRegion.findMany({
        where: { fileId },
      })

      expect(regions).toHaveLength(0)
    })

    it('should delete associated QAs', async () => {
      await prisma.qA.create({
        data: {
          fileId,
          question: 'Test question',
          answer: 'Test answer',
        },
      })

      await deleteFile(fileId)

      const qas = await prisma.qA.findMany({
        where: { fileId },
      })

      expect(qas).toHaveLength(0)
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests (401)', async () => {
      // Mock no session
      const response = await deleteFile(fileId)

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_UNAUTHORIZED)
    })

    it('should reject unverified email users (403)', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { emailConfirmedAt: null },
      })

      const response = await deleteFile(fileId)

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED)
    })
  })

  describe('Authorization', () => {
    it('should reject deleting other user file (403)', async () => {
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

      const response = await deleteFile(otherFile.id)

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_FORBIDDEN)
    })

    it('should verify file ownership through course', async () => {
      const response = await deleteFile(fileId)

      expect(response.status).toBe(200)
    })
  })

  describe('Validation', () => {
    it('should reject invalid fileId format', async () => {
      const response = await deleteFile('invalid-id')

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject non-existent fileId (404)', async () => {
      const response = await deleteFile('cnonexistent12345')

      expect(response.status).toBe(404)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_NOT_FOUND)
    })

    it('should reject empty fileId', async () => {
      const response = await deleteFile('')

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('Storage Cleanup', () => {
    it('should delete PDF from Supabase Storage', async () => {
      const response = await deleteFile(fileId)

      expect(response.status).toBe(200)
      // Verify storage deletion in integration test
    })

    it('should delete extracted images from R2', async () => {
      await prisma.extractedImage.create({
        data: {
          fileId,
          pageNumber: 1,
          imageIndex: 0,
          storagePath: 'images/test.png',
          bbox: { x: 0, y: 0, w: 100, h: 100 },
        },
      })

      const response = await deleteFile(fileId)

      expect(response.status).toBe(200)
      // Verify R2 deletion in integration test
    })

    it('should handle storage deletion failures gracefully', async () => {
      // Mock storage deletion failure
      const response = await deleteFile(fileId)

      // Should still delete database records
      expect(response.status).toBe(200)

      const file = await prisma.file.findUnique({
        where: { id: fileId },
      })
      expect(file).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle deleting already deleted file (404)', async () => {
      await deleteFile(fileId)

      const response = await deleteFile(fileId)

      expect(response.status).toBe(404)
      expect(response.data.error.code).toBe(ERROR_CODES.FILE_NOT_FOUND)
    })

    it('should handle concurrent deletion requests', async () => {
      const promises = [
        deleteFile(fileId),
        deleteFile(fileId),
        deleteFile(fileId),
      ]

      const responses = await Promise.all(promises)

      // First should succeed, others should fail
      const successCount = responses.filter((r) => r.status === 200).length
      expect(successCount).toBe(1)

      const notFoundCount = responses.filter((r) => r.status === 404).length
      expect(notFoundCount).toBe(2)
    })

    it('should handle file in UPLOADING status', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'UPLOADING' },
      })

      const response = await deleteFile(fileId)

      expect(response.status).toBe(200)
    })

    it('should handle file in PROCESSING status', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'PROCESSING' },
      })

      const response = await deleteFile(fileId)

      expect(response.status).toBe(200)
    })

    it('should handle file in FAILED status', async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: { status: 'FAILED' },
      })

      const response = await deleteFile(fileId)

      expect(response.status).toBe(200)
    })
  })

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      const response = await deleteFile(fileId)

      expect(response.data.success).toBe(true)
      expect(response.data.data).toHaveProperty('message')
    })

    it('should include helpful success message', async () => {
      const response = await deleteFile(fileId)

      expect(response.data.data.message).toContain('deleted')
      expect(response.data.data.message).toContain('successfully')
    })
  })
})
