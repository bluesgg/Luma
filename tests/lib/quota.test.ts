// =============================================================================
// Phase 5: Quota Management - Utility Tests (TDD)
// Testing quota checking, consumption, refund, and reset logic
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES, QUOTA_LIMITS } from '@/lib/constants'

// Functions to be implemented in src/lib/quota/index.ts
import {
  getUserQuota,
  checkQuota,
  consumeQuota,
  refundQuota,
  resetQuota,
  adjustQuota,
  getUserQuotas,
  getQuotaStats,
  isQuotaLow,
  isQuotaExceeded,
} from '@/lib/quota'

describe('Quota Management Utilities (Phase 5)', () => {
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
        email: 'quota-test@example.com',
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

  describe('getUserQuota', () => {
    it('should create quota if not exists with default limits', async () => {
      const quota = await getUserQuota(userId, 'LEARNING_INTERACTIONS')

      expect(quota).toBeDefined()
      expect(quota.userId).toBe(userId)
      expect(quota.bucket).toBe('LEARNING_INTERACTIONS')
      expect(quota.used).toBe(0)
      expect(quota.limit).toBe(QUOTA_LIMITS.LEARNING_INTERACTIONS)
      expect(quota.resetAt).toBeInstanceOf(Date)
    })

    it('should return existing quota if already created', async () => {
      // Create quota manually
      const created = await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 50,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const quota = await getUserQuota(userId, 'LEARNING_INTERACTIONS')

      expect(quota.id).toBe(created.id)
      expect(quota.used).toBe(50)
    })

    it('should auto-reset expired quota', async () => {
      // Create expired quota
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date(Date.now() - 1000), // Past date
        },
      })

      const quota = await getUserQuota(userId, 'LEARNING_INTERACTIONS')

      expect(quota.used).toBe(0)
      expect(quota.resetAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should use correct default limit for AUTO_EXPLAIN bucket', async () => {
      const quota = await getUserQuota(userId, 'AUTO_EXPLAIN')

      expect(quota.limit).toBe(QUOTA_LIMITS.AUTO_EXPLAIN)
    })
  })

  describe('checkQuota', () => {
    it('should return allowed=true when quota available', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 50,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const result = await checkQuota(userId, 'LEARNING_INTERACTIONS', 10)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(100)
    })

    it('should return allowed=false when quota exceeded', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 145,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const result = await checkQuota(userId, 'LEARNING_INTERACTIONS', 10)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(5)
    })

    it('should return allowed=true when exactly at limit', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 145,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const result = await checkQuota(userId, 'LEARNING_INTERACTIONS', 5)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)
    })

    it('should default to checking 1 unit if amount not specified', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 149,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const result = await checkQuota(userId, 'LEARNING_INTERACTIONS')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1)
    })
  })

  describe('consumeQuota', () => {
    it('should increment used quota on consumption', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 50,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const result = await consumeQuota(userId, 'LEARNING_INTERACTIONS', 10)

      expect(result.success).toBe(true)
      expect(result.remaining).toBe(90)

      const quota = await prisma.quota.findUnique({
        where: { userId_bucket: { userId, bucket: 'LEARNING_INTERACTIONS' } },
      })
      expect(quota?.used).toBe(60)
    })

    it('should return success=false when quota exceeded', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 145,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const result = await consumeQuota(userId, 'LEARNING_INTERACTIONS', 10)

      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)

      // Quota should not be updated
      const quota = await prisma.quota.findUnique({
        where: { userId_bucket: { userId, bucket: 'LEARNING_INTERACTIONS' } },
      })
      expect(quota?.used).toBe(145)
    })

    it('should create QuotaLog entry on consumption', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 50,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await consumeQuota(userId, 'LEARNING_INTERACTIONS', 10, {
        action: 'explain',
        sessionId: 'session-123',
      })

      const logs = await prisma.quotaLog.findMany({
        where: { userId, reason: 'CONSUME' },
      })

      expect(logs).toHaveLength(1)
      expect(logs[0].change).toBe(-10)
      expect(logs[0].bucket).toBe('LEARNING_INTERACTIONS')
      expect(logs[0].metadata).toEqual({
        action: 'explain',
        sessionId: 'session-123',
      })
    })

    it('should default to consuming 1 unit if amount not specified', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 50,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await consumeQuota(userId, 'LEARNING_INTERACTIONS')

      const quota = await prisma.quota.findUnique({
        where: { userId_bucket: { userId, bucket: 'LEARNING_INTERACTIONS' } },
      })
      expect(quota?.used).toBe(51)
    })

    it('should handle concurrent consumption requests atomically', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 50,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      // Simulate concurrent requests
      await Promise.all([
        consumeQuota(userId, 'LEARNING_INTERACTIONS', 10),
        consumeQuota(userId, 'LEARNING_INTERACTIONS', 10),
        consumeQuota(userId, 'LEARNING_INTERACTIONS', 10),
      ])

      const quota = await prisma.quota.findUnique({
        where: { userId_bucket: { userId, bucket: 'LEARNING_INTERACTIONS' } },
      })

      // Should have consumed all 30 units
      expect(quota?.used).toBe(80)
    })
  })

  describe('refundQuota', () => {
    it('should decrement used quota on refund', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 60,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await refundQuota(userId, 'LEARNING_INTERACTIONS', 10)

      const quota = await prisma.quota.findUnique({
        where: { userId_bucket: { userId, bucket: 'LEARNING_INTERACTIONS' } },
      })
      expect(quota?.used).toBe(50)
    })

    it('should not allow used to go below zero', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 5,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await refundQuota(userId, 'LEARNING_INTERACTIONS', 10)

      const quota = await prisma.quota.findUnique({
        where: { userId_bucket: { userId, bucket: 'LEARNING_INTERACTIONS' } },
      })
      expect(quota?.used).toBe(0)
    })

    it('should create QuotaLog entry with REFUND reason', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 60,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await refundQuota(userId, 'LEARNING_INTERACTIONS', 10, {
        reason: 'error occurred',
      })

      const logs = await prisma.quotaLog.findMany({
        where: { userId, reason: 'REFUND' },
      })

      expect(logs).toHaveLength(1)
      expect(logs[0].change).toBe(10)
      expect(logs[0].metadata).toEqual({ reason: 'error occurred' })
    })

    it('should default to refunding 1 unit if amount not specified', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 60,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await refundQuota(userId, 'LEARNING_INTERACTIONS')

      const quota = await prisma.quota.findUnique({
        where: { userId_bucket: { userId, bucket: 'LEARNING_INTERACTIONS' } },
      })
      expect(quota?.used).toBe(59)
    })
  })

  describe('resetQuota', () => {
    it('should reset used to 0', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 120,
          limit: 150,
          resetAt: new Date(Date.now() - 1000),
        },
      })

      const result = await resetQuota(userId, 'LEARNING_INTERACTIONS')

      expect(result.used).toBe(0)
    })

    it('should set new resetAt date to next month', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 120,
          limit: 150,
          resetAt: new Date(Date.now() - 1000),
        },
      })

      const result = await resetQuota(userId, 'LEARNING_INTERACTIONS')

      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now())

      // Should be approximately 30 days from now
      const daysUntilReset = Math.floor(
        (result.resetAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      expect(daysUntilReset).toBeGreaterThan(20)
      expect(daysUntilReset).toBeLessThan(35)
    })

    it('should create QuotaLog entry with SYSTEM_RESET reason', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 120,
          limit: 150,
          resetAt: new Date(Date.now() - 1000),
        },
      })

      await resetQuota(userId, 'LEARNING_INTERACTIONS')

      const logs = await prisma.quotaLog.findMany({
        where: { userId, reason: 'SYSTEM_RESET' },
      })

      expect(logs).toHaveLength(1)
      expect(logs[0].change).toBe(0)
      expect(logs[0].metadata).toHaveProperty('previousUsed')
    })

    it('should handle edge case: 31st to Feb (28/29 days)', async () => {
      // Create quota with January 31st reset date
      const jan31 = new Date(2024, 0, 31) // Jan 31, 2024
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: jan31,
        },
      })

      const result = await resetQuota(userId, 'LEARNING_INTERACTIONS')

      // Next reset should be March 1st (not Feb 31st which doesn't exist)
      expect(result.resetAt.getMonth()).toBeGreaterThanOrEqual(1) // Feb or later
    })
  })

  describe('adjustQuota', () => {
    it('should update quota limit', async () => {
      const adminId = 'admin-123'

      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 50,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await adjustQuota(
        userId,
        'LEARNING_INTERACTIONS',
        200,
        adminId,
        'Premium upgrade'
      )

      const quota = await prisma.quota.findUnique({
        where: { userId_bucket: { userId, bucket: 'LEARNING_INTERACTIONS' } },
      })
      expect(quota?.limit).toBe(200)
      expect(quota?.used).toBe(50) // Used should not change
    })

    it('should create QuotaLog entry with ADMIN_ADJUST reason', async () => {
      const adminId = 'admin-123'

      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 50,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await adjustQuota(
        userId,
        'LEARNING_INTERACTIONS',
        200,
        adminId,
        'Premium upgrade'
      )

      const logs = await prisma.quotaLog.findMany({
        where: { userId, reason: 'ADMIN_ADJUST' },
      })

      expect(logs).toHaveLength(1)
      expect(logs[0].change).toBe(50) // 200 - 150
      expect(logs[0].metadata).toMatchObject({
        adminId: 'admin-123',
        reason: 'Premium upgrade',
        previousLimit: 150,
        newLimit: 200,
      })
    })

    it('should handle decreasing quota limit', async () => {
      const adminId = 'admin-123'

      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 50,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await adjustQuota(
        userId,
        'LEARNING_INTERACTIONS',
        100,
        adminId,
        'Downgrade'
      )

      const quota = await prisma.quota.findUnique({
        where: { userId_bucket: { userId, bucket: 'LEARNING_INTERACTIONS' } },
      })
      expect(quota?.limit).toBe(100)

      const logs = await prisma.quotaLog.findMany({
        where: { userId, reason: 'ADMIN_ADJUST' },
      })
      expect(logs[0].change).toBe(-50) // 100 - 150
    })
  })

  describe('getUserQuotas', () => {
    it('should return all quota buckets for user', async () => {
      const quotas = await getUserQuotas(userId)

      expect(quotas).toHaveProperty('learningInteractions')
      expect(quotas).toHaveProperty('autoExplain')
      expect(quotas.learningInteractions.limit).toBe(
        QUOTA_LIMITS.LEARNING_INTERACTIONS
      )
      expect(quotas.autoExplain.limit).toBe(QUOTA_LIMITS.AUTO_EXPLAIN)
    })

    it('should create quotas if they do not exist', async () => {
      const quotas = await getUserQuotas(userId)

      const dbQuotas = await prisma.quota.findMany({
        where: { userId },
      })

      expect(dbQuotas).toHaveLength(2)
    })
  })

  describe('getQuotaStats', () => {
    it('should return quota statistics with percentage', async () => {
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

      const stats = await getQuotaStats(userId)

      expect(stats.learningInteractions).toMatchObject({
        used: 75,
        limit: 150,
        remaining: 75,
        percentage: 50,
      })
      expect(stats.autoExplain).toMatchObject({
        used: 200,
        limit: 300,
        remaining: 100,
        percentage: 67,
      })
    })

    it('should include resetAt date', async () => {
      const stats = await getQuotaStats(userId)

      expect(stats.learningInteractions.resetAt).toBeInstanceOf(Date)
      expect(stats.autoExplain.resetAt).toBeInstanceOf(Date)
    })

    it('should handle 100% usage correctly', async () => {
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

      const stats = await getQuotaStats(userId)

      expect(stats.learningInteractions.percentage).toBe(100)
      expect(stats.learningInteractions.remaining).toBe(0)
    })
  })

  describe('isQuotaLow', () => {
    it('should return true when less than 20% remaining', () => {
      expect(isQuotaLow(130, 150)).toBe(true) // 13.3% remaining
      expect(isQuotaLow(121, 150)).toBe(true) // 19.3% remaining
    })

    it('should return false when 20% or more remaining', () => {
      expect(isQuotaLow(120, 150)).toBe(false) // 20% remaining
      expect(isQuotaLow(75, 150)).toBe(false) // 50% remaining
      expect(isQuotaLow(0, 150)).toBe(false) // 100% remaining
    })

    it('should handle edge case of 0 usage', () => {
      expect(isQuotaLow(0, 150)).toBe(false)
    })

    it('should handle edge case of full usage', () => {
      expect(isQuotaLow(150, 150)).toBe(true) // 0% remaining
    })
  })

  describe('isQuotaExceeded', () => {
    it('should return true when used equals limit', () => {
      expect(isQuotaExceeded(150, 150)).toBe(true)
    })

    it('should return true when used exceeds limit', () => {
      expect(isQuotaExceeded(151, 150)).toBe(true)
    })

    it('should return false when under limit', () => {
      expect(isQuotaExceeded(149, 150)).toBe(false)
      expect(isQuotaExceeded(0, 150)).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero consumption gracefully', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 50,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const result = await consumeQuota(userId, 'LEARNING_INTERACTIONS', 0)

      expect(result.success).toBe(true)

      const quota = await prisma.quota.findUnique({
        where: { userId_bucket: { userId, bucket: 'LEARNING_INTERACTIONS' } },
      })
      expect(quota?.used).toBe(50) // Should not change
    })

    it('should handle negative refund amount as zero', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 50,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await refundQuota(userId, 'LEARNING_INTERACTIONS', -10)

      const quota = await prisma.quota.findUnique({
        where: { userId_bucket: { userId, bucket: 'LEARNING_INTERACTIONS' } },
      })
      expect(quota?.used).toBe(50) // Should not change or increase
    })

    it('should handle very large consumption amount', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 50,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const result = await consumeQuota(userId, 'LEARNING_INTERACTIONS', 1000)

      expect(result.success).toBe(false)
    })

    it('should handle quota exactly at boundary', async () => {
      await prisma.quota.create({
        data: {
          userId,
          bucket: 'LEARNING_INTERACTIONS',
          used: 150,
          limit: 150,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const check = await checkQuota(userId, 'LEARNING_INTERACTIONS', 1)
      expect(check.allowed).toBe(false)

      const consume = await consumeQuota(userId, 'LEARNING_INTERACTIONS', 1)
      expect(consume.success).toBe(false)
    })
  })

  describe('Initialization on User Registration', () => {
    it('should create quotas for new user on first access', async () => {
      const quotas = await getUserQuotas(userId)

      const dbQuotas = await prisma.quota.findMany({
        where: { userId },
      })

      expect(dbQuotas).toHaveLength(2)
      expect(dbQuotas.some((q) => q.bucket === 'LEARNING_INTERACTIONS')).toBe(
        true
      )
      expect(dbQuotas.some((q) => q.bucket === 'AUTO_EXPLAIN')).toBe(true)
    })

    it('should set correct initial limits based on constants', async () => {
      const quotas = await getUserQuotas(userId)

      expect(quotas.learningInteractions.limit).toBe(150)
      expect(quotas.autoExplain.limit).toBe(300)
      expect(quotas.learningInteractions.used).toBe(0)
      expect(quotas.autoExplain.used).toBe(0)
    })

    it('should set resetAt to approximately 30 days from now', async () => {
      const quotas = await getUserQuotas(userId)

      const resetDate = quotas.learningInteractions.resetAt
      const daysUntilReset = Math.floor(
        (resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      expect(daysUntilReset).toBeGreaterThan(20)
      expect(daysUntilReset).toBeLessThan(35)
    })
  })
})
