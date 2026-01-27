// =============================================================================
// Admin AI Cost Monitoring API Tests (TDD - Phase 7)
// GET /api/admin/cost
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

async function getAICost(
  sessionCookie?: string,
  params?: { period?: string }
) {
  const headers: any = {}
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie
  }

  const queryParams = new URLSearchParams(params as any)
  const url = `/api/admin/cost${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

  const response = await fetch(url, { method: 'GET', headers })
  return { status: response.status, data: await response.json() }
}

describe('GET /api/admin/cost', () => {
  let userId: string

  beforeEach(async () => {
    await prisma.aiUsageLog.deleteMany()
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
    await prisma.aiUsageLog.deleteMany()
    await prisma.user.deleteMany()
    await prisma.admin.deleteMany()
  })

  describe('Authentication', () => {
    it('should require admin authentication', async () => {
      const response = await getAICost()
      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe('ADMIN_UNAUTHORIZED')
    })

    it('should allow admin access', async () => {
      const response = await getAICost('luma-admin-session=valid-token')
      expect(response.status).toBe(200)
    })
  })

  describe('Happy Path', () => {
    it('should return total input tokens', async () => {
      await prisma.aiUsageLog.createMany({
        data: [
          {
            userId,
            actionType: 'EXPLAIN',
            model: 'gpt-4',
            inputTokens: 1000,
            outputTokens: 500,
            cost: 0.05,
          },
          {
            userId,
            actionType: 'QA',
            model: 'gpt-4',
            inputTokens: 500,
            outputTokens: 300,
            cost: 0.03,
          },
        ],
      })

      const response = await getAICost('luma-admin-session=valid-token')
      expect(response.data.data.totalInputTokens).toBe(1500)
    })

    it('should return total output tokens', async () => {
      await prisma.aiUsageLog.create({
        data: {
          userId,
          actionType: 'EXPLAIN',
          model: 'gpt-4',
          inputTokens: 1000,
          outputTokens: 800,
          cost: 0.05,
        },
      })

      const response = await getAICost('luma-admin-session=valid-token')
      expect(response.data.data.totalOutputTokens).toBe(800)
    })

    it('should return estimated cost', async () => {
      await prisma.aiUsageLog.createMany({
        data: [
          {
            userId,
            actionType: 'EXPLAIN',
            model: 'gpt-4',
            inputTokens: 1000,
            outputTokens: 500,
            cost: 0.05,
          },
          {
            userId,
            actionType: 'QA',
            model: 'gpt-4',
            inputTokens: 500,
            outputTokens: 300,
            cost: 0.03,
          },
        ],
      })

      const response = await getAICost('luma-admin-session=valid-token')
      expect(response.data.data.estimatedCost).toBe(0.08)
    })

    it('should return breakdown by model', async () => {
      await prisma.aiUsageLog.createMany({
        data: [
          {
            userId,
            actionType: 'EXPLAIN',
            model: 'gpt-4',
            inputTokens: 1000,
            outputTokens: 500,
            cost: 0.05,
          },
          {
            userId,
            actionType: 'QA',
            model: 'gpt-3.5-turbo',
            inputTokens: 500,
            outputTokens: 300,
            cost: 0.01,
          },
        ],
      })

      const response = await getAICost('luma-admin-session=valid-token')
      expect(response.data.data.byModel).toBeInstanceOf(Array)
      expect(response.data.data.byModel.length).toBeGreaterThan(0)
    })

    it('should return daily trend data', async () => {
      await prisma.aiUsageLog.create({
        data: {
          userId,
          actionType: 'EXPLAIN',
          model: 'gpt-4',
          inputTokens: 1000,
          outputTokens: 500,
          cost: 0.05,
          timestamp: new Date(),
        },
      })

      const response = await getAICost('luma-admin-session=valid-token')
      expect(response.data.data.dailyTrend).toBeInstanceOf(Array)
    })
  })

  describe('Response Format', () => {
    it('should have all required fields', async () => {
      const response = await getAICost('luma-admin-session=valid-token')

      expect(response.data.data).toHaveProperty('totalInputTokens')
      expect(response.data.data).toHaveProperty('totalOutputTokens')
      expect(response.data.data).toHaveProperty('estimatedCost')
      expect(response.data.data).toHaveProperty('byModel')
      expect(response.data.data).toHaveProperty('dailyTrend')
    })

    it('should return model breakdown with correct structure', async () => {
      await prisma.aiUsageLog.create({
        data: {
          userId,
          actionType: 'EXPLAIN',
          model: 'gpt-4',
          inputTokens: 1000,
          outputTokens: 500,
          cost: 0.05,
        },
      })

      const response = await getAICost('luma-admin-session=valid-token')

      if (response.data.data.byModel.length > 0) {
        const modelData = response.data.data.byModel[0]
        expect(modelData).toHaveProperty('model')
        expect(modelData).toHaveProperty('inputTokens')
        expect(modelData).toHaveProperty('outputTokens')
        expect(modelData).toHaveProperty('cost')
      }
    })
  })

  describe('Query Parameters', () => {
    it('should filter by period (7 days)', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      const today = new Date()

      await prisma.aiUsageLog.createMany({
        data: [
          {
            userId,
            actionType: 'EXPLAIN',
            model: 'gpt-4',
            inputTokens: 1000,
            outputTokens: 500,
            cost: 0.05,
            timestamp: today,
          },
          {
            userId,
            actionType: 'QA',
            model: 'gpt-4',
            inputTokens: 500,
            outputTokens: 300,
            cost: 0.03,
            timestamp: tenDaysAgo,
          },
        ],
      })

      const response = await getAICost('luma-admin-session=valid-token', {
        period: '7d',
      })

      expect(response.data.data.totalInputTokens).toBe(1000)
    })

    it('should filter by period (30 days)', async () => {
      const response = await getAICost('luma-admin-session=valid-token', {
        period: '30d',
      })
      expect(response.status).toBe(200)
    })
  })

  describe('Edge Cases', () => {
    it('should return zero values for empty logs', async () => {
      const response = await getAICost('luma-admin-session=valid-token')

      expect(response.data.data.totalInputTokens).toBe(0)
      expect(response.data.data.totalOutputTokens).toBe(0)
      expect(response.data.data.estimatedCost).toBe(0)
    })

    it('should handle large token counts', async () => {
      await prisma.aiUsageLog.create({
        data: {
          userId,
          actionType: 'STRUCTURE_EXTRACT',
          model: 'gpt-4',
          inputTokens: 1000000,
          outputTokens: 500000,
          cost: 50.0,
        },
      })

      const response = await getAICost('luma-admin-session=valid-token')
      expect(response.status).toBe(200)
      expect(response.data.data.totalInputTokens).toBe(1000000)
    })
  })
})
