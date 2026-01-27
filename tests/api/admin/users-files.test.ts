// =============================================================================
// Admin User File Statistics API Tests (TDD - Phase 7)
// GET /api/admin/users/[id]/files
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

async function getUserFileStats(userId: string, sessionCookie?: string) {
  const headers: any = {}
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie
  }

  const response = await fetch(`/api/admin/users/${userId}/files`, {
    method: 'GET',
    headers,
  })
  return { status: response.status, data: await response.json() }
}

describe('GET /api/admin/users/[id]/files', () => {
  let userId: string
  let courseId: string

  beforeEach(async () => {
    await prisma.file.deleteMany()
    await prisma.course.deleteMany()
    await prisma.user.deleteMany()
    await prisma.admin.deleteMany()

    await prisma.admin.create({
      data: {
        email: 'admin@luma.com',
        passwordHash: '$2b$10$hashedpassword',
        role: 'ADMIN',
      },
    })

    const user = await prisma.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: 'hash',
        emailConfirmedAt: new Date(),
      },
    })
    userId = user.id

    const course = await prisma.course.create({
      data: { userId, name: 'Test Course' },
    })
    courseId = course.id
  })

  afterEach(async () => {
    await prisma.file.deleteMany()
    await prisma.course.deleteMany()
    await prisma.user.deleteMany()
    await prisma.admin.deleteMany()
  })

  describe('Authentication', () => {
    it('should require admin authentication', async () => {
      const response = await getUserFileStats(userId)
      expect(response.status).toBe(401)
    })

    it('should allow admin access', async () => {
      const response = await getUserFileStats(
        userId,
        'luma-admin-session=valid-token'
      )
      expect(response.status).toBe(200)
    })
  })

  describe('Happy Path', () => {
    it('should return user email', async () => {
      const response = await getUserFileStats(
        userId,
        'luma-admin-session=valid-token'
      )

      expect(response.data.data.userId).toBe(userId)
      expect(response.data.data.email).toBe('user@example.com')
    })

    it('should return file count summary', async () => {
      await prisma.file.createMany({
        data: [
          {
            courseId,
            name: 'file1.pdf',
            fileSize: BigInt(1000000),
            storagePath: 'path1',
            status: 'READY',
          },
          {
            courseId,
            name: 'file2.pdf',
            fileSize: BigInt(2000000),
            storagePath: 'path2',
            status: 'READY',
          },
        ],
      })

      const response = await getUserFileStats(
        userId,
        'luma-admin-session=valid-token'
      )

      expect(response.data.data.summary.totalFiles).toBe(2)
    })

    it('should return total storage used', async () => {
      await prisma.file.createMany({
        data: [
          {
            courseId,
            name: 'file1.pdf',
            fileSize: BigInt(1000000),
            storagePath: 'path1',
          },
          {
            courseId,
            name: 'file2.pdf',
            fileSize: BigInt(2500000),
            storagePath: 'path2',
          },
        ],
      })

      const response = await getUserFileStats(
        userId,
        'luma-admin-session=valid-token'
      )

      expect(response.data.data.summary.totalStorage).toBe('3500000')
    })

    it('should return total page count', async () => {
      await prisma.file.createMany({
        data: [
          {
            courseId,
            name: 'file1.pdf',
            fileSize: BigInt(1000000),
            storagePath: 'path1',
            pageCount: 10,
          },
          {
            courseId,
            name: 'file2.pdf',
            fileSize: BigInt(2000000),
            storagePath: 'path2',
            pageCount: 25,
          },
        ],
      })

      const response = await getUserFileStats(
        userId,
        'luma-admin-session=valid-token'
      )

      expect(response.data.data.summary.totalPages).toBe(35)
    })

    it('should return files by status', async () => {
      await prisma.file.createMany({
        data: [
          {
            courseId,
            name: 'ready.pdf',
            fileSize: BigInt(1000000),
            storagePath: 'path1',
            status: 'READY',
          },
          {
            courseId,
            name: 'processing.pdf',
            fileSize: BigInt(2000000),
            storagePath: 'path2',
            status: 'PROCESSING',
          },
          {
            courseId,
            name: 'failed.pdf',
            fileSize: BigInt(3000000),
            storagePath: 'path3',
            status: 'FAILED',
          },
        ],
      })

      const response = await getUserFileStats(
        userId,
        'luma-admin-session=valid-token'
      )

      expect(response.data.data.summary.filesByStatus.READY).toBe(1)
      expect(response.data.data.summary.filesByStatus.PROCESSING).toBe(1)
      expect(response.data.data.summary.filesByStatus.FAILED).toBe(1)
    })

    it('should return breakdown by course', async () => {
      const course2 = await prisma.course.create({
        data: { userId, name: 'Course 2' },
      })

      await prisma.file.createMany({
        data: [
          {
            courseId,
            name: 'file1.pdf',
            fileSize: BigInt(1000000),
            storagePath: 'path1',
          },
          {
            courseId,
            name: 'file2.pdf',
            fileSize: BigInt(2000000),
            storagePath: 'path2',
          },
          {
            courseId: course2.id,
            name: 'file3.pdf',
            fileSize: BigInt(3000000),
            storagePath: 'path3',
          },
        ],
      })

      const response = await getUserFileStats(
        userId,
        'luma-admin-session=valid-token'
      )

      expect(response.data.data.byCourse).toBeInstanceOf(Array)
      expect(response.data.data.byCourse.length).toBe(2)
    })

    it('should return upload timeline', async () => {
      await prisma.file.create({
        data: {
          courseId,
          name: 'file.pdf',
          fileSize: BigInt(1000000),
          storagePath: 'path',
          createdAt: new Date(),
        },
      })

      const response = await getUserFileStats(
        userId,
        'luma-admin-session=valid-token'
      )

      expect(response.data.data.uploadTimeline).toBeInstanceOf(Array)
    })
  })

  describe('Response Format', () => {
    it('should have all required fields', async () => {
      const response = await getUserFileStats(
        userId,
        'luma-admin-session=valid-token'
      )

      expect(response.data.data).toHaveProperty('userId')
      expect(response.data.data).toHaveProperty('email')
      expect(response.data.data).toHaveProperty('summary')
      expect(response.data.data).toHaveProperty('byCourse')
      expect(response.data.data).toHaveProperty('uploadTimeline')
    })

    it('should have correct summary structure', async () => {
      const response = await getUserFileStats(
        userId,
        'luma-admin-session=valid-token'
      )

      expect(response.data.data.summary).toHaveProperty('totalFiles')
      expect(response.data.data.summary).toHaveProperty('totalStorage')
      expect(response.data.data.summary).toHaveProperty('totalPages')
      expect(response.data.data.summary).toHaveProperty('filesByStatus')
    })

    it('should have correct byCourse structure', async () => {
      await prisma.file.create({
        data: {
          courseId,
          name: 'file.pdf',
          fileSize: BigInt(1000000),
          storagePath: 'path',
        },
      })

      const response = await getUserFileStats(
        userId,
        'luma-admin-session=valid-token'
      )

      if (response.data.data.byCourse.length > 0) {
        const courseData = response.data.data.byCourse[0]
        expect(courseData).toHaveProperty('courseId')
        expect(courseData).toHaveProperty('courseName')
        expect(courseData).toHaveProperty('fileCount')
        expect(courseData).toHaveProperty('storageUsed')
      }
    })
  })

  describe('Edge Cases', () => {
    it('should return zero stats for user with no files', async () => {
      const response = await getUserFileStats(
        userId,
        'luma-admin-session=valid-token'
      )

      expect(response.data.data.summary.totalFiles).toBe(0)
      expect(response.data.data.summary.totalStorage).toBe('0')
      expect(response.data.data.summary.totalPages).toBe(0)
    })

    it('should handle non-existent user', async () => {
      const response = await getUserFileStats(
        'non-existent-id',
        'luma-admin-session=valid-token'
      )

      expect(response.status).toBe(404)
    })

    it('should handle user with many files efficiently', async () => {
      const files = Array.from({ length: 100 }, (_, i) => ({
        courseId,
        name: `file${i}.pdf`,
        fileSize: BigInt(1000000),
        storagePath: `path${i}`,
      }))
      await prisma.file.createMany({ data: files })

      const start = Date.now()
      const response = await getUserFileStats(
        userId,
        'luma-admin-session=valid-token'
      )
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(5000)
    })
  })
})
