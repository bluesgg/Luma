// =============================================================================
// Admin Worker Health API Tests (TDD - Phase 7)
// GET /api/admin/workers
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

async function getWorkerHealth(sessionCookie?: string) {
  const headers: any = {}
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie
  }

  const response = await fetch('/api/admin/workers', {
    method: 'GET',
    headers,
  })
  return { status: response.status, data: await response.json() }
}

describe('GET /api/admin/workers', () => {
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

    const course = await prisma.course.create({
      data: { userId: user.id, name: 'Course' },
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
      const response = await getWorkerHealth()
      expect(response.status).toBe(401)
    })

    it('should allow admin access', async () => {
      const response = await getWorkerHealth('luma-admin-session=valid-token')
      expect(response.status).toBe(200)
    })
  })

  describe('Happy Path', () => {
    it('should return summary with job counts', async () => {
      await prisma.file.createMany({
        data: [
          {
            courseId,
            name: 'processing.pdf',
            fileSize: BigInt(1000000),
            storagePath: 'path1',
            structureStatus: 'PROCESSING',
          },
          {
            courseId,
            name: 'pending.pdf',
            fileSize: BigInt(1000000),
            storagePath: 'path2',
            structureStatus: 'PENDING',
          },
          {
            courseId,
            name: 'failed.pdf',
            fileSize: BigInt(1000000),
            storagePath: 'path3',
            structureStatus: 'FAILED',
          },
        ],
      })

      const response = await getWorkerHealth('luma-admin-session=valid-token')

      expect(response.data.data.summary).toBeDefined()
      expect(response.data.data.summary.active).toBe(1)
      expect(response.data.data.summary.pending).toBe(1)
      expect(response.data.data.summary.failed).toBe(1)
    })

    it('should detect zombie jobs (>10 minutes processing)', async () => {
      const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000)

      await prisma.file.create({
        data: {
          courseId,
          name: 'zombie.pdf',
          fileSize: BigInt(1000000),
          storagePath: 'path',
          structureStatus: 'PROCESSING',
          extractedAt: elevenMinutesAgo,
        },
      })

      const response = await getWorkerHealth('luma-admin-session=valid-token')

      expect(response.data.data.summary.zombie).toBe(1)
    })

    it('should return jobs list with details', async () => {
      await prisma.file.create({
        data: {
          courseId,
          name: 'test.pdf',
          fileSize: BigInt(1000000),
          storagePath: 'path',
          structureStatus: 'PROCESSING',
        },
      })

      const response = await getWorkerHealth('luma-admin-session=valid-token')

      expect(response.data.data.jobs).toBeInstanceOf(Array)
      expect(response.data.data.jobs.length).toBeGreaterThan(0)
    })

    it('should include job metadata in response', async () => {
      const file = await prisma.file.create({
        data: {
          courseId,
          name: 'test.pdf',
          fileSize: BigInt(1000000),
          storagePath: 'path',
          structureStatus: 'PROCESSING',
          extractedAt: new Date(),
        },
      })

      const response = await getWorkerHealth('luma-admin-session=valid-token')

      const job = response.data.data.jobs.find((j: any) => j.fileId === file.id)
      expect(job).toBeDefined()
      expect(job.fileName).toBe('test.pdf')
      expect(job.status).toBe('PROCESSING')
      expect(job.startedAt).toBeDefined()
    })
  })

  describe('Response Format', () => {
    it('should have all required fields', async () => {
      const response = await getWorkerHealth('luma-admin-session=valid-token')

      expect(response.data.data).toHaveProperty('summary')
      expect(response.data.data).toHaveProperty('jobs')
      expect(response.data.data.summary).toHaveProperty('active')
      expect(response.data.data.summary).toHaveProperty('pending')
      expect(response.data.data.summary).toHaveProperty('failed')
      expect(response.data.data.summary).toHaveProperty('zombie')
    })

    it('should return jobs with correct structure', async () => {
      await prisma.file.create({
        data: {
          courseId,
          name: 'test.pdf',
          fileSize: BigInt(1000000),
          storagePath: 'path',
          structureStatus: 'PROCESSING',
          extractedAt: new Date(),
        },
      })

      const response = await getWorkerHealth('luma-admin-session=valid-token')

      if (response.data.data.jobs.length > 0) {
        const job = response.data.data.jobs[0]
        expect(job).toHaveProperty('fileId')
        expect(job).toHaveProperty('fileName')
        expect(job).toHaveProperty('status')
        expect(job).toHaveProperty('startedAt')
        expect(job).toHaveProperty('isZombie')
      }
    })
  })

  describe('Edge Cases', () => {
    it('should return zero counts for no jobs', async () => {
      const response = await getWorkerHealth('luma-admin-session=valid-token')

      expect(response.data.data.summary.active).toBe(0)
      expect(response.data.data.summary.pending).toBe(0)
      expect(response.data.data.summary.failed).toBe(0)
      expect(response.data.data.summary.zombie).toBe(0)
    })

    it('should handle many jobs efficiently', async () => {
      const files = Array.from({ length: 100 }, (_, i) => ({
        courseId,
        name: `file${i}.pdf`,
        fileSize: BigInt(1000000),
        storagePath: `path${i}`,
        structureStatus: 'PROCESSING' as const,
      }))
      await prisma.file.createMany({ data: files })

      const start = Date.now()
      const response = await getWorkerHealth('luma-admin-session=valid-token')
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(5000)
    })
  })

  describe('Failed Jobs', () => {
    it('should include error message for failed jobs', async () => {
      await prisma.file.create({
        data: {
          courseId,
          name: 'failed.pdf',
          fileSize: BigInt(1000000),
          storagePath: 'path',
          structureStatus: 'FAILED',
          structureError: 'PDF parsing error',
        },
      })

      const response = await getWorkerHealth('luma-admin-session=valid-token')

      const failedJob = response.data.data.jobs.find(
        (j: any) => j.status === 'FAILED'
      )
      expect(failedJob).toBeDefined()
      expect(failedJob.error).toBe('PDF parsing error')
    })
  })
})
