// =============================================================================
// Phase 5: Quota Management - API Route Tests (TDD)
// Testing GET /api/quota endpoint
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES, QUOTA_LIMITS } from '@/lib/constants'

// Mock fetch helper for API testing
async function getQuotaStatus() {
  const response = await fetch('/api/quota', {
    method: 'GET',
  })
  return {
    status: response.status,
    data: await response.json(),
  }
}

describe('GET /api/quota (Phase 5 - QUOTA-002)', () => {
  let userId: string
  let testUser: any

  beforeEach(async () => {
    // Clean database
    await prisma.quotaLog.deleteMany()
    await prisma.quota.deleteMany()
    await prisma.user.deleteMany()

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'quota-api-test@example.com',
        passwordHash: 'hashed_password',
        emailConfirmedAt: new Date(),
      },
    })
    userId = testUser.id
  })

  afterEach(async () => {
    await prisma.quotaLog.deleteMany()
    await prisma.quota.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Happy Path', () => {
    it('should return all quota buckets for authenticated user', async () => {
      // Mock authenticated session
      // This would be done via actual auth middleware

      const response = await getQuotaStatus()

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data).toHaveProperty('learningInteractions')
      expect(response.data.data).toHaveProperty('autoExplain')
    })

    it('should return quota with used, limit, and remaining fields', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 50,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          {
            userId,
            bucket: 'AUTO_EXPLAIN',
            used: 100,
            limit: 300,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      expect(response.data.data.learningInteractions).toMatchObject({
        used: 50,
        limit: 150,
        remaining: 100,
      })
      expect(response.data.data.autoExplain).toMatchObject({
        used: 100,
        limit: 300,
        remaining: 200,
      })
    })

    it('should return percentage used for each bucket', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 75,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          {
            userId,
            bucket: 'AUTO_EXPLAIN',
            used: 200,
            limit: 300,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      expect(response.data.data.learningInteractions.percentage).toBe(50)
      expect(response.data.data.autoExplain.percentage).toBe(67) // Rounded
    })

    it('should return resetAt date for each bucket', async () => {
      const resetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 50,
            limit: 150,
            resetAt: resetDate,
          },
          {
            userId,
            bucket: 'AUTO_EXPLAIN',
            used: 100,
            limit: 300,
            resetAt: resetDate,
          },
        ],
      })

      const response = await getQuotaStatus()

      expect(response.data.data.learningInteractions).toHaveProperty('resetAt')
      expect(response.data.data.autoExplain).toHaveProperty('resetAt')

      const learningResetAt = new Date(
        response.data.data.learningInteractions.resetAt
      )
      expect(learningResetAt.getTime()).toBeCloseTo(resetDate.getTime(), -3)
    })

    it('should return status color based on percentage', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 60,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      // Green: < 70%
      expect(response.data.data.learningInteractions.status).toBe('green')
    })

    it('should return yellow status when 70-90% used', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 120,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      // Yellow: 70-90%
      expect(response.data.data.learningInteractions.status).toBe('yellow')
    })

    it('should return red status when > 90% used', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 140,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      // Red: > 90%
      expect(response.data.data.learningInteractions.status).toBe('red')
    })

    it('should create default quotas if they do not exist', async () => {
      const response = await getQuotaStatus()

      expect(response.status).toBe(200)
      expect(response.data.data.learningInteractions.limit).toBe(
        QUOTA_LIMITS.LEARNING_INTERACTIONS
      )
      expect(response.data.data.autoExplain.limit).toBe(
        QUOTA_LIMITS.AUTO_EXPLAIN
      )
      expect(response.data.data.learningInteractions.used).toBe(0)
      expect(response.data.data.autoExplain.used).toBe(0)
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests with 401', async () => {
      // Mock no session
      const response = await getQuotaStatus()

      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_UNAUTHORIZED)
    })

    it('should include error message for unauthenticated request', async () => {
      const response = await getQuotaStatus()

      expect(response.data.error.message).toContain('authenticated')
    })
  })

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      const response = await getQuotaStatus()

      expect(response.data).toHaveProperty('success')
      expect(response.data).toHaveProperty('data')
      expect(response.data.data).toHaveProperty('learningInteractions')
      expect(response.data.data).toHaveProperty('autoExplain')
    })

    it('should serialize dates correctly', async () => {
      const response = await getQuotaStatus()

      const resetAt = response.data.data.learningInteractions.resetAt
      expect(typeof resetAt).toBe('string')

      // Should be valid ISO date string
      const date = new Date(resetAt)
      expect(date.toString()).not.toBe('Invalid Date')
    })

    it('should include all required fields for each bucket', async () => {
      const response = await getQuotaStatus()

      const fields = [
        'used',
        'limit',
        'remaining',
        'percentage',
        'resetAt',
        'status',
      ]

      fields.forEach((field) => {
        expect(response.data.data.learningInteractions).toHaveProperty(field)
        expect(response.data.data.autoExplain).toHaveProperty(field)
      })
    })
  })

  describe('Status Color Calculation', () => {
    it('should return green for 0% usage', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 0,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      expect(response.data.data.learningInteractions.status).toBe('green')
      expect(response.data.data.learningInteractions.percentage).toBe(0)
    })

    it('should return green for 69% usage', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 103,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      expect(response.data.data.learningInteractions.status).toBe('green')
    })

    it('should return yellow for exactly 70% usage', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 105,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      expect(response.data.data.learningInteractions.status).toBe('yellow')
      expect(response.data.data.learningInteractions.percentage).toBe(70)
    })

    it('should return yellow for 90% usage', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 135,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      expect(response.data.data.learningInteractions.status).toBe('yellow')
      expect(response.data.data.learningInteractions.percentage).toBe(90)
    })

    it('should return red for 91% usage', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 137,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      expect(response.data.data.learningInteractions.status).toBe('red')
      expect(response.data.data.learningInteractions.percentage).toBe(91)
    })

    it('should return red for 100% usage', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 150,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      expect(response.data.data.learningInteractions.status).toBe('red')
      expect(response.data.data.learningInteractions.percentage).toBe(100)
      expect(response.data.data.learningInteractions.remaining).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle quota with custom limits', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 75,
            limit: 200, // Custom limit (not default 150)
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      expect(response.data.data.learningInteractions.limit).toBe(200)
      expect(response.data.data.learningInteractions.remaining).toBe(125)
      expect(response.data.data.learningInteractions.percentage).toBe(38) // Rounded from 37.5
    })

    it('should handle quota that needs reset', async () => {
      // Create expired quota
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 100,
            limit: 150,
            resetAt: new Date(Date.now() - 1000), // Past date
          },
        ],
      })

      const response = await getQuotaStatus()

      // Should auto-reset
      expect(response.data.data.learningInteractions.used).toBe(0)
      expect(response.data.data.learningInteractions.percentage).toBe(0)

      const resetDate = new Date(
        response.data.data.learningInteractions.resetAt
      )
      expect(resetDate.getTime()).toBeGreaterThan(Date.now())
    })

    it('should handle rounding of percentages correctly', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 100,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      // 100/150 = 66.666...% should round to 67%
      expect(response.data.data.learningInteractions.percentage).toBe(67)
    })

    it('should handle very large quota values', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId,
            bucket: 'LEARNING_INTERACTIONS',
            used: 10000,
            limit: 1000000,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const response = await getQuotaStatus()

      expect(response.data.data.learningInteractions.percentage).toBe(1)
      expect(response.data.data.learningInteractions.remaining).toBe(990000)
    })
  })

  describe('CORS and Headers', () => {
    it('should set correct content-type header', async () => {
      const response = await fetch('/api/quota', { method: 'GET' })

      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should handle OPTIONS request for CORS', async () => {
      const response = await fetch('/api/quota', { method: 'OPTIONS' })

      expect([200, 204]).toContain(response.status)
    })
  })

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const start = Date.now()
      await getQuotaStatus()
      const duration = Date.now() - start

      // Should respond in less than 500ms
      expect(duration).toBeLessThan(500)
    })

    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () => getQuotaStatus())

      const responses = await Promise.all(requests)

      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      vi.spyOn(prisma.quota, 'findUnique').mockRejectedValueOnce(
        new Error('Database connection error')
      )

      const response = await getQuotaStatus()

      expect(response.status).toBe(500)
      expect(response.data.error.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR)
    })

    it('should not expose internal error details', async () => {
      vi.spyOn(prisma.quota, 'findUnique').mockRejectedValueOnce(
        new Error('Sensitive database error with credentials')
      )

      const response = await getQuotaStatus()

      expect(response.data.error.message).not.toContain('credentials')
      expect(response.data.error.message).toContain('error')
    })
  })
})
