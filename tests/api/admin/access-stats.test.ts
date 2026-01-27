// =============================================================================
// Admin Access Statistics API Tests (TDD - Phase 7)
// GET /api/admin/access-stats
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

async function getAccessStats(
  sessionCookie?: string,
  params?: { period?: string; groupBy?: string }
) {
  const headers: any = {}
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie
  }

  const queryParams = new URLSearchParams(params as any)
  const url = `/api/admin/access-stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })
  return {
    status: response.status,
    data: await response.json(),
  }
}

describe('GET /api/admin/access-stats', () => {
  let userId: string

  beforeEach(async () => {
    await prisma.accessLog.deleteMany()
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
  })

  afterEach(async () => {
    await prisma.accessLog.deleteMany()
    await prisma.user.deleteMany()
    await prisma.admin.deleteMany()
  })

  describe('Authentication', () => {
    it('should require admin authentication', async () => {
      const response = await getAccessStats()

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe('ADMIN_UNAUTHORIZED')
    })

    it('should allow admin access', async () => {
      const response = await getAccessStats('luma-admin-session=valid-token')

      expect(response.status).toBe(200)
    })
  })

  describe('Happy Path', () => {
    it('should return total page views', async () => {
      await prisma.accessLog.createMany({
        data: [
          { userId, actionType: 'LOGIN' },
          { userId, actionType: 'VIEW_FILE' },
          { userId, actionType: 'VIEW_FILE' },
        ],
      })

      const response = await getAccessStats('luma-admin-session=valid-token')

      expect(response.data.data.totalPageViews).toBeGreaterThanOrEqual(3)
    })

    it('should return Q&A usage count', async () => {
      await prisma.accessLog.createMany({
        data: [
          { userId, actionType: 'USE_QA' },
          { userId, actionType: 'USE_QA' },
        ],
      })

      const response = await getAccessStats('luma-admin-session=valid-token')

      expect(response.data.data.totalQAUsage).toBe(2)
    })

    it('should return explain usage count', async () => {
      await prisma.accessLog.createMany({
        data: [
          { userId, actionType: 'USE_EXPLAIN' },
          { userId, actionType: 'USE_EXPLAIN' },
          { userId, actionType: 'USE_EXPLAIN' },
        ],
      })

      const response = await getAccessStats('luma-admin-session=valid-token')

      expect(response.data.data.totalExplainUsage).toBe(3)
    })

    it('should return timeline data', async () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      await prisma.accessLog.createMany({
        data: [
          { userId, actionType: 'VIEW_FILE', timestamp: today },
          { userId, actionType: 'VIEW_FILE', timestamp: yesterday },
        ],
      })

      const response = await getAccessStats('luma-admin-session=valid-token')

      expect(response.data.data.timeline).toBeInstanceOf(Array)
      expect(response.data.data.timeline.length).toBeGreaterThan(0)
    })

    it('should return breakdown by action type', async () => {
      await prisma.accessLog.createMany({
        data: [
          { userId, actionType: 'LOGIN' },
          { userId, actionType: 'VIEW_FILE' },
          { userId, actionType: 'USE_QA' },
          { userId, actionType: 'USE_EXPLAIN' },
        ],
      })

      const response = await getAccessStats('luma-admin-session=valid-token')

      expect(response.data.data.breakdown).toBeDefined()
      expect(response.data.data.breakdown.byAction).toBeDefined()
      expect(response.data.data.breakdown.byAction.LOGIN).toBe(1)
      expect(response.data.data.breakdown.byAction.VIEW_FILE).toBe(1)
    })
  })

  describe('Query Parameters', () => {
    it('should filter by period (7 days)', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      const today = new Date()

      await prisma.accessLog.createMany({
        data: [
          { userId, actionType: 'VIEW_FILE', timestamp: today },
          { userId, actionType: 'VIEW_FILE', timestamp: tenDaysAgo },
        ],
      })

      const response = await getAccessStats('luma-admin-session=valid-token', {
        period: '7d',
      })

      expect(response.data.data.totalPageViews).toBe(1)
    })

    it('should filter by period (30 days)', async () => {
      const response = await getAccessStats('luma-admin-session=valid-token', {
        period: '30d',
      })

      expect(response.status).toBe(200)
    })

    it('should support daily grouping', async () => {
      const response = await getAccessStats('luma-admin-session=valid-token', {
        groupBy: 'day',
      })

      expect(response.status).toBe(200)
      expect(response.data.data.timeline).toBeInstanceOf(Array)
    })

    it('should support monthly grouping', async () => {
      const response = await getAccessStats('luma-admin-session=valid-token', {
        groupBy: 'month',
      })

      expect(response.status).toBe(200)
    })
  })

  describe('Response Format', () => {
    it('should have all required fields', async () => {
      const response = await getAccessStats('luma-admin-session=valid-token')

      expect(response.data.data).toHaveProperty('totalPageViews')
      expect(response.data.data).toHaveProperty('totalQAUsage')
      expect(response.data.data).toHaveProperty('totalExplainUsage')
      expect(response.data.data).toHaveProperty('timeline')
      expect(response.data.data).toHaveProperty('breakdown')
    })

    it('should return timeline with correct structure', async () => {
      await prisma.accessLog.create({
        data: { userId, actionType: 'VIEW_FILE' },
      })

      const response = await getAccessStats('luma-admin-session=valid-token')

      if (response.data.data.timeline.length > 0) {
        const timelineItem = response.data.data.timeline[0]
        expect(timelineItem).toHaveProperty('date')
        expect(timelineItem).toHaveProperty('pageViews')
        expect(timelineItem).toHaveProperty('qaUsage')
        expect(timelineItem).toHaveProperty('explainUsage')
      }
    })
  })

  describe('Edge Cases', () => {
    it('should return zero stats for empty logs', async () => {
      const response = await getAccessStats('luma-admin-session=valid-token')

      expect(response.data.data.totalPageViews).toBe(0)
      expect(response.data.data.totalQAUsage).toBe(0)
      expect(response.data.data.totalExplainUsage).toBe(0)
    })

    it('should handle invalid period parameter', async () => {
      const response = await getAccessStats('luma-admin-session=valid-token', {
        period: 'invalid',
      })

      expect([200, 400]).toContain(response.status)
    })

    it('should handle invalid groupBy parameter', async () => {
      const response = await getAccessStats('luma-admin-session=valid-token', {
        groupBy: 'invalid',
      })

      expect([200, 400]).toContain(response.status)
    })
  })
})
