// =============================================================================
// Admin Mathpix Cost API Tests (TDD - Phase 7)
// GET /api/admin/cost/mathpix
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

async function getMathpixCost(sessionCookie?: string) {
  const headers: any = {}
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie
  }

  const response = await fetch('/api/admin/cost/mathpix', {
    method: 'GET',
    headers,
  })
  return { status: response.status, data: await response.json() }
}

describe('GET /api/admin/cost/mathpix', () => {
  let userId: string
  let fileId: string

  beforeEach(async () => {
    await prisma.mathpixUsage.deleteMany()
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
      data: { userId, name: 'Course' },
    })

    const file = await prisma.file.create({
      data: {
        courseId: course.id,
        name: 'test.pdf',
        fileSize: BigInt(1000000),
        storagePath: 'path',
      },
    })
    fileId = file.id
  })

  afterEach(async () => {
    await prisma.mathpixUsage.deleteMany()
    await prisma.file.deleteMany()
    await prisma.course.deleteMany()
    await prisma.user.deleteMany()
    await prisma.admin.deleteMany()
  })

  describe('Authentication', () => {
    it('should require admin authentication', async () => {
      const response = await getMathpixCost()
      expect(response.status).toBe(401)
    })

    it('should allow admin access', async () => {
      const response = await getMathpixCost('luma-admin-session=valid-token')
      expect(response.status).toBe(200)
    })
  })

  describe('Happy Path', () => {
    it('should return total requests count', async () => {
      await prisma.mathpixUsage.createMany({
        data: [
          { userId, fileId },
          { userId, fileId },
          { userId, fileId },
        ],
      })

      const response = await getMathpixCost('luma-admin-session=valid-token')
      expect(response.data.data.totalRequests).toBe(3)
    })

    it('should return estimated cost ($0.004 per request)', async () => {
      await prisma.mathpixUsage.createMany({
        data: Array.from({ length: 10 }, () => ({ userId, fileId })),
      })

      const response = await getMathpixCost('luma-admin-session=valid-token')
      expect(response.data.data.estimatedCost).toBe(0.04) // 10 * 0.004
    })

    it('should return top users by usage', async () => {
      await prisma.mathpixUsage.createMany({
        data: Array.from({ length: 5 }, () => ({ userId, fileId })),
      })

      const response = await getMathpixCost('luma-admin-session=valid-token')
      expect(response.data.data.topUsers).toBeInstanceOf(Array)
      expect(response.data.data.topUsers.length).toBeGreaterThan(0)
    })

    it('should return daily trend data', async () => {
      await prisma.mathpixUsage.create({
        data: { userId, fileId, timestamp: new Date() },
      })

      const response = await getMathpixCost('luma-admin-session=valid-token')
      expect(response.data.data.dailyTrend).toBeInstanceOf(Array)
    })
  })

  describe('Response Format', () => {
    it('should have all required fields', async () => {
      const response = await getMathpixCost('luma-admin-session=valid-token')

      expect(response.data.data).toHaveProperty('totalRequests')
      expect(response.data.data).toHaveProperty('estimatedCost')
      expect(response.data.data).toHaveProperty('topUsers')
      expect(response.data.data).toHaveProperty('dailyTrend')
    })

    it('should return top users with correct structure', async () => {
      await prisma.mathpixUsage.createMany({
        data: [{ userId, fileId }, { userId, fileId }],
      })

      const response = await getMathpixCost('luma-admin-session=valid-token')

      if (response.data.data.topUsers.length > 0) {
        const userData = response.data.data.topUsers[0]
        expect(userData).toHaveProperty('userId')
        expect(userData).toHaveProperty('email')
        expect(userData).toHaveProperty('requestCount')
        expect(userData).toHaveProperty('cost')
      }
    })
  })

  describe('Edge Cases', () => {
    it('should return zero values for no usage', async () => {
      const response = await getMathpixCost('luma-admin-session=valid-token')

      expect(response.data.data.totalRequests).toBe(0)
      expect(response.data.data.estimatedCost).toBe(0)
    })

    it('should handle large request counts', async () => {
      await prisma.mathpixUsage.createMany({
        data: Array.from({ length: 10000 }, () => ({ userId, fileId })),
      })

      const response = await getMathpixCost('luma-admin-session=valid-token')
      expect(response.status).toBe(200)
      expect(response.data.data.totalRequests).toBe(10000)
      expect(response.data.data.estimatedCost).toBe(40) // 10000 * 0.004
    })
  })
})
