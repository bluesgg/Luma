// =============================================================================
// Admin System Stats API Tests (TDD - Phase 7)
// GET /api/admin/stats
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

async function getSystemStats(sessionCookie?: string) {
  const headers: any = {}
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie
  }

  const response = await fetch('/api/admin/stats', {
    method: 'GET',
    headers,
  })
  return {
    status: response.status,
    data: await response.json(),
  }
}

describe('GET /api/admin/stats', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany()
    await prisma.course.deleteMany()
    await prisma.file.deleteMany()
    await prisma.admin.deleteMany()

    await prisma.admin.create({
      data: {
        email: 'admin@luma.com',
        passwordHash: '$2b$10$hashedpassword',
        role: 'ADMIN',
      },
    })
  })

  afterEach(async () => {
    await prisma.user.deleteMany()
    await prisma.course.deleteMany()
    await prisma.file.deleteMany()
    await prisma.admin.deleteMany()
  })

  describe('Authentication', () => {
    it('should require admin authentication', async () => {
      const response = await getSystemStats()

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe('ADMIN_UNAUTHORIZED')
    })

    it('should allow admin access', async () => {
      const response = await getSystemStats('luma-admin-session=valid-token')

      expect(response.status).toBe(200)
    })

    it('should allow super admin access', async () => {
      const response = await getSystemStats('luma-admin-session=super-token')

      expect(response.status).toBe(200)
    })
  })

  describe('Happy Path', () => {
    it('should return total users count', async () => {
      await prisma.user.createMany({
        data: [
          {
            email: 'user1@example.com',
            passwordHash: 'hash',
            emailConfirmedAt: new Date(),
          },
          {
            email: 'user2@example.com',
            passwordHash: 'hash',
            emailConfirmedAt: new Date(),
          },
        ],
      })

      const response = await getSystemStats('luma-admin-session=valid-token')

      expect(response.status).toBe(200)
      expect(response.data.data.totalUsers).toBe(2)
    })

    it('should return total courses count', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash: 'hash',
          emailConfirmedAt: new Date(),
        },
      })

      await prisma.course.createMany({
        data: [
          { userId: user.id, name: 'Course 1' },
          { userId: user.id, name: 'Course 2' },
          { userId: user.id, name: 'Course 3' },
        ],
      })

      const response = await getSystemStats('luma-admin-session=valid-token')

      expect(response.data.data.totalCourses).toBe(3)
    })

    it('should return total files count', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash: 'hash',
          emailConfirmedAt: new Date(),
        },
      })

      const course = await prisma.course.create({
        data: { userId: user.id, name: 'Course 1' },
      })

      await prisma.file.createMany({
        data: [
          {
            courseId: course.id,
            name: 'file1.pdf',
            fileSize: BigInt(1000000),
            storagePath: 'path1',
          },
          {
            courseId: course.id,
            name: 'file2.pdf',
            fileSize: BigInt(2000000),
            storagePath: 'path2',
          },
        ],
      })

      const response = await getSystemStats('luma-admin-session=valid-token')

      expect(response.data.data.totalFiles).toBe(2)
    })

    it('should return total storage used', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash: 'hash',
          emailConfirmedAt: new Date(),
        },
      })

      const course = await prisma.course.create({
        data: { userId: user.id, name: 'Course 1' },
      })

      await prisma.file.createMany({
        data: [
          {
            courseId: course.id,
            name: 'file1.pdf',
            fileSize: BigInt(1000000),
            storagePath: 'path1',
          },
          {
            courseId: course.id,
            name: 'file2.pdf',
            fileSize: BigInt(2000000),
            storagePath: 'path2',
          },
        ],
      })

      const response = await getSystemStats('luma-admin-session=valid-token')

      expect(response.data.data.totalStorageUsed).toBe('3000000')
    })

    it('should return active users count (last 7 days)', async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)

      await prisma.user.createMany({
        data: [
          {
            email: 'active1@example.com',
            passwordHash: 'hash',
            lastLoginAt: new Date(),
          },
          {
            email: 'active2@example.com',
            passwordHash: 'hash',
            lastLoginAt: sevenDaysAgo,
          },
          {
            email: 'inactive@example.com',
            passwordHash: 'hash',
            lastLoginAt: eightDaysAgo,
          },
        ],
      })

      const response = await getSystemStats('luma-admin-session=valid-token')

      expect(response.data.data.activeUsers).toBe(2)
    })

    it('should return new users this month count', async () => {
      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)

      const lastMonth = new Date(thisMonth)
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      await prisma.user.createMany({
        data: [
          {
            email: 'new1@example.com',
            passwordHash: 'hash',
            createdAt: new Date(),
          },
          {
            email: 'new2@example.com',
            passwordHash: 'hash',
            createdAt: thisMonth,
          },
          {
            email: 'old@example.com',
            passwordHash: 'hash',
            createdAt: lastMonth,
          },
        ],
      })

      const response = await getSystemStats('luma-admin-session=valid-token')

      expect(response.data.data.newUsersThisMonth).toBeGreaterThanOrEqual(2)
    })

    it('should return files processing count', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash: 'hash',
          emailConfirmedAt: new Date(),
        },
      })

      const course = await prisma.course.create({
        data: { userId: user.id, name: 'Course 1' },
      })

      await prisma.file.createMany({
        data: [
          {
            courseId: course.id,
            name: 'file1.pdf',
            fileSize: BigInt(1000000),
            storagePath: 'path1',
            status: 'PROCESSING',
          },
          {
            courseId: course.id,
            name: 'file2.pdf',
            fileSize: BigInt(2000000),
            storagePath: 'path2',
            status: 'READY',
          },
          {
            courseId: course.id,
            name: 'file3.pdf',
            fileSize: BigInt(3000000),
            storagePath: 'path3',
            structureStatus: 'PROCESSING',
          },
        ],
      })

      const response = await getSystemStats('luma-admin-session=valid-token')

      expect(response.data.data.filesProcessing).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Response Format', () => {
    it('should have all required fields', async () => {
      const response = await getSystemStats('luma-admin-session=valid-token')

      expect(response.data.data).toHaveProperty('totalUsers')
      expect(response.data.data).toHaveProperty('totalCourses')
      expect(response.data.data).toHaveProperty('totalFiles')
      expect(response.data.data).toHaveProperty('totalStorageUsed')
      expect(response.data.data).toHaveProperty('activeUsers')
      expect(response.data.data).toHaveProperty('newUsersThisMonth')
      expect(response.data.data).toHaveProperty('filesProcessing')
    })

    it('should return numbers for count fields', async () => {
      const response = await getSystemStats('luma-admin-session=valid-token')

      expect(typeof response.data.data.totalUsers).toBe('number')
      expect(typeof response.data.data.totalCourses).toBe('number')
      expect(typeof response.data.data.totalFiles).toBe('number')
      expect(typeof response.data.data.activeUsers).toBe('number')
    })

    it('should return zero counts for empty database', async () => {
      const response = await getSystemStats('luma-admin-session=valid-token')

      expect(response.data.data.totalUsers).toBe(0)
      expect(response.data.data.totalCourses).toBe(0)
      expect(response.data.data.totalFiles).toBe(0)
      expect(response.data.data.filesProcessing).toBe(0)
    })
  })

  describe('Performance', () => {
    it('should respond quickly with large datasets', async () => {
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

      // Create many files
      const files = Array.from({ length: 100 }, (_, i) => ({
        courseId: course.id,
        name: `file${i}.pdf`,
        fileSize: BigInt(1000000),
        storagePath: `path${i}`,
      }))
      await prisma.file.createMany({ data: files })

      const start = Date.now()
      const response = await getSystemStats('luma-admin-session=valid-token')
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
    })
  })
})
