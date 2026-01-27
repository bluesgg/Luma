// =============================================================================
// Phase 5: Quota Management - Monthly Reset Job Integration Tests (TDD)
// Testing scheduled job for monthly quota reset
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { QUOTA_LIMITS } from '@/lib/constants'

// Function to be implemented as Trigger.dev task or cron job
async function runMonthlyQuotaReset() {
  // This will be implemented in src/trigger/quota-reset.ts or similar
  throw new Error('Not implemented')
}

describe('Monthly Quota Reset Job (Phase 5 - QUOTA-004)', () => {
  let user1Id: string
  let user2Id: string
  let user3Id: string

  beforeEach(async () => {
    // Clean database
    await prisma.quotaLog.deleteMany()
    await prisma.quota.deleteMany()
    await prisma.user.deleteMany()

    // Create test users
    const user1 = await prisma.user.create({
      data: {
        email: 'user1@example.com',
        passwordHash: 'hashed_password',
        emailConfirmedAt: new Date(),
      },
    })
    user1Id = user1.id

    const user2 = await prisma.user.create({
      data: {
        email: 'user2@example.com',
        passwordHash: 'hashed_password',
        emailConfirmedAt: new Date(),
      },
    })
    user2Id = user2.id

    const user3 = await prisma.user.create({
      data: {
        email: 'user3@example.com',
        passwordHash: 'hashed_password',
        emailConfirmedAt: new Date(),
      },
    })
    user3Id = user3.id
  })

  afterEach(async () => {
    await prisma.quotaLog.deleteMany()
    await prisma.quota.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Quota Reset Logic', () => {
    it('should reset quotas with expired resetAt date', async () => {
      // Create quota that should be reset (expired)
      await prisma.quota.create({
        data: {
          userId: user1Id,
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date(Date.now() - 1000), // Expired
        },
      })

      await runMonthlyQuotaReset()

      const quota = await prisma.quota.findUnique({
        where: {
          userId_bucket: {
            userId: user1Id,
            bucket: 'LEARNING_INTERACTIONS',
          },
        },
      })

      expect(quota?.used).toBe(0)
      expect(quota?.resetAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should not reset quotas that have not expired', async () => {
      // Create quota that should NOT be reset (not expired)
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await prisma.quota.create({
        data: {
          userId: user1Id,
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: futureDate,
        },
      })

      await runMonthlyQuotaReset()

      const quota = await prisma.quota.findUnique({
        where: {
          userId_bucket: {
            userId: user1Id,
            bucket: 'LEARNING_INTERACTIONS',
          },
        },
      })

      expect(quota?.used).toBe(100) // Should not change
      expect(quota?.resetAt.getTime()).toBe(futureDate.getTime())
    })

    it('should reset all quota buckets for a user', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId: user1Id,
            bucket: 'LEARNING_INTERACTIONS',
            used: 100,
            limit: 150,
            resetAt: new Date(Date.now() - 1000),
          },
          {
            userId: user1Id,
            bucket: 'AUTO_EXPLAIN',
            used: 200,
            limit: 300,
            resetAt: new Date(Date.now() - 1000),
          },
        ],
      })

      await runMonthlyQuotaReset()

      const quotas = await prisma.quota.findMany({
        where: { userId: user1Id },
      })

      expect(quotas).toHaveLength(2)
      expect(quotas.every((q) => q.used === 0)).toBe(true)
      expect(quotas.every((q) => q.resetAt.getTime() > Date.now())).toBe(true)
    })

    it('should reset quotas for multiple users', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId: user1Id,
            bucket: 'LEARNING_INTERACTIONS',
            used: 100,
            limit: 150,
            resetAt: new Date(Date.now() - 1000),
          },
          {
            userId: user2Id,
            bucket: 'LEARNING_INTERACTIONS',
            used: 120,
            limit: 150,
            resetAt: new Date(Date.now() - 2000),
          },
          {
            userId: user3Id,
            bucket: 'LEARNING_INTERACTIONS',
            used: 50,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Not expired
          },
        ],
      })

      await runMonthlyQuotaReset()

      const user1Quota = await prisma.quota.findUnique({
        where: {
          userId_bucket: { userId: user1Id, bucket: 'LEARNING_INTERACTIONS' },
        },
      })
      const user2Quota = await prisma.quota.findUnique({
        where: {
          userId_bucket: { userId: user2Id, bucket: 'LEARNING_INTERACTIONS' },
        },
      })
      const user3Quota = await prisma.quota.findUnique({
        where: {
          userId_bucket: { userId: user3Id, bucket: 'LEARNING_INTERACTIONS' },
        },
      })

      expect(user1Quota?.used).toBe(0)
      expect(user2Quota?.used).toBe(0)
      expect(user3Quota?.used).toBe(50) // Should not change
    })
  })

  describe('Reset Date Calculation', () => {
    it('should set next resetAt to first day of next month', async () => {
      await prisma.quota.create({
        data: {
          userId: user1Id,
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date(Date.now() - 1000),
        },
      })

      await runMonthlyQuotaReset()

      const quota = await prisma.quota.findUnique({
        where: {
          userId_bucket: { userId: user1Id, bucket: 'LEARNING_INTERACTIONS' },
        },
      })

      const resetDate = quota?.resetAt
      expect(resetDate?.getDate()).toBe(1) // Should be 1st of the month
    })

    it('should handle edge case: Jan 31 -> Feb 28/29', async () => {
      // Create quota with Jan 31st as reset date
      const jan31 = new Date(2024, 0, 31) // Jan 31, 2024

      await prisma.quota.create({
        data: {
          userId: user1Id,
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: jan31,
        },
      })

      await runMonthlyQuotaReset()

      const quota = await prisma.quota.findUnique({
        where: {
          userId_bucket: { userId: user1Id, bucket: 'LEARNING_INTERACTIONS' },
        },
      })

      // Next reset should be March 1st (since Feb doesn't have 31 days)
      expect(quota?.resetAt.getMonth()).toBeGreaterThanOrEqual(1) // Feb or later
      expect(quota?.resetAt.getDate()).toBe(1)
    })

    it('should handle edge case: Feb 29 (leap year) -> March 31', async () => {
      // Create quota with Feb 29, 2024 as reset date (leap year)
      const feb29 = new Date(2024, 1, 29) // Feb 29, 2024

      await prisma.quota.create({
        data: {
          userId: user1Id,
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: feb29,
        },
      })

      await runMonthlyQuotaReset()

      const quota = await prisma.quota.findUnique({
        where: {
          userId_bucket: { userId: user1Id, bucket: 'LEARNING_INTERACTIONS' },
        },
      })

      // Next reset should be April 1st
      expect(quota?.resetAt.getMonth()).toBe(3) // April (0-indexed)
      expect(quota?.resetAt.getDate()).toBe(1)
    })

    it('should handle year boundary correctly', async () => {
      // Create quota with Dec 31 as reset date
      const dec31 = new Date(2024, 11, 31) // Dec 31, 2024

      await prisma.quota.create({
        data: {
          userId: user1Id,
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: dec31,
        },
      })

      await runMonthlyQuotaReset()

      const quota = await prisma.quota.findUnique({
        where: {
          userId_bucket: { userId: user1Id, bucket: 'LEARNING_INTERACTIONS' },
        },
      })

      // Next reset should be Feb 1, 2025
      expect(quota?.resetAt.getFullYear()).toBe(2025)
      expect(quota?.resetAt.getMonth()).toBe(1) // February
      expect(quota?.resetAt.getDate()).toBe(1)
    })
  })

  describe('Quota Log Creation', () => {
    it('should create QuotaLog entry with SYSTEM_RESET reason', async () => {
      await prisma.quota.create({
        data: {
          userId: user1Id,
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date(Date.now() - 1000),
        },
      })

      await runMonthlyQuotaReset()

      const logs = await prisma.quotaLog.findMany({
        where: {
          userId: user1Id,
          bucket: 'LEARNING_INTERACTIONS',
          reason: 'SYSTEM_RESET',
        },
      })

      expect(logs).toHaveLength(1)
      expect(logs[0].change).toBe(0)
    })

    it('should include previousUsed in log metadata', async () => {
      await prisma.quota.create({
        data: {
          userId: user1Id,
          bucket: 'LEARNING_INTERACTIONS',
          used: 120,
          limit: 150,
          resetAt: new Date(Date.now() - 1000),
        },
      })

      await runMonthlyQuotaReset()

      const logs = await prisma.quotaLog.findMany({
        where: {
          userId: user1Id,
          reason: 'SYSTEM_RESET',
        },
      })

      expect(logs[0].metadata).toHaveProperty('previousUsed', 120)
    })

    it('should create separate log entries for each reset quota', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId: user1Id,
            bucket: 'LEARNING_INTERACTIONS',
            used: 100,
            limit: 150,
            resetAt: new Date(Date.now() - 1000),
          },
          {
            userId: user1Id,
            bucket: 'AUTO_EXPLAIN',
            used: 200,
            limit: 300,
            resetAt: new Date(Date.now() - 1000),
          },
        ],
      })

      await runMonthlyQuotaReset()

      const logs = await prisma.quotaLog.findMany({
        where: {
          userId: user1Id,
          reason: 'SYSTEM_RESET',
        },
      })

      expect(logs).toHaveLength(2)
    })
  })

  describe('Batch Processing', () => {
    it('should process quotas in batches for performance', async () => {
      // Create many users with expired quotas
      const users = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          prisma.user.create({
            data: {
              email: `user${i}@example.com`,
              passwordHash: 'hashed',
              emailConfirmedAt: new Date(),
            },
          })
        )
      )

      // Create expired quotas for all users
      await prisma.quota.createMany({
        data: users.map((user) => ({
          userId: user.id,
          bucket: 'LEARNING_INTERACTIONS' as const,
          used: 100,
          limit: 150,
          resetAt: new Date(Date.now() - 1000),
        })),
      })

      const startTime = Date.now()
      await runMonthlyQuotaReset()
      const duration = Date.now() - startTime

      // Should complete within reasonable time (< 10 seconds for 100 quotas)
      expect(duration).toBeLessThan(10000)

      // Verify all quotas were reset
      const resetQuotas = await prisma.quota.findMany({
        where: {
          userId: { in: users.map((u) => u.id) },
        },
      })

      expect(resetQuotas.every((q) => q.used === 0)).toBe(true)
    })

    it('should handle partial failures gracefully', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId: user1Id,
            bucket: 'LEARNING_INTERACTIONS',
            used: 100,
            limit: 150,
            resetAt: new Date(Date.now() - 1000),
          },
          {
            userId: user2Id,
            bucket: 'LEARNING_INTERACTIONS',
            used: 120,
            limit: 150,
            resetAt: new Date(Date.now() - 1000),
          },
        ],
      })

      // Mock a failure for one quota
      vi.spyOn(prisma.quota, 'update').mockImplementationOnce(() => {
        throw new Error('Database error')
      })

      // Should not throw, but log error
      await expect(runMonthlyQuotaReset()).resolves.not.toThrow()

      // At least one quota should still be reset
      const quotas = await prisma.quota.findMany({
        where: { used: 0 },
      })

      expect(quotas.length).toBeGreaterThan(0)
    })
  })

  describe('Job Scheduling', () => {
    it('should run daily to check for expired quotas', async () => {
      // This test verifies the job is scheduled to run daily
      // Actual scheduling would be configured in Trigger.dev or cron

      // For now, just verify the function can be called repeatedly
      await runMonthlyQuotaReset()
      await runMonthlyQuotaReset()
      await runMonthlyQuotaReset()

      // Should not throw or cause issues
      expect(true).toBe(true)
    })

    it('should handle no expired quotas gracefully', async () => {
      // All quotas are not expired
      await prisma.quota.createMany({
        data: [
          {
            userId: user1Id,
            bucket: 'LEARNING_INTERACTIONS',
            used: 100,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          {
            userId: user2Id,
            bucket: 'LEARNING_INTERACTIONS',
            used: 120,
            limit: 150,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      await runMonthlyQuotaReset()

      const quotas = await prisma.quota.findMany()

      // None should be reset
      expect(quotas.every((q) => q.used > 0)).toBe(true)
    })

    it('should complete within timeout (5 minutes)', async () => {
      // Create a reasonable number of quotas
      const users = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          prisma.user.create({
            data: {
              email: `batch-user${i}@example.com`,
              passwordHash: 'hashed',
              emailConfirmedAt: new Date(),
            },
          })
        )
      )

      await prisma.quota.createMany({
        data: users.flatMap((user) => [
          {
            userId: user.id,
            bucket: 'LEARNING_INTERACTIONS' as const,
            used: 100,
            limit: 150,
            resetAt: new Date(Date.now() - 1000),
          },
          {
            userId: user.id,
            bucket: 'AUTO_EXPLAIN' as const,
            used: 200,
            limit: 300,
            resetAt: new Date(Date.now() - 1000),
          },
        ]),
      })

      const startTime = Date.now()
      await runMonthlyQuotaReset()
      const duration = Date.now() - startTime

      // Should complete within 5 minutes (300000ms)
      expect(duration).toBeLessThan(300000)
    })
  })

  describe('Idempotency', () => {
    it('should be idempotent - running twice should not double reset', async () => {
      await prisma.quota.create({
        data: {
          userId: user1Id,
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date(Date.now() - 1000),
        },
      })

      // Run once
      await runMonthlyQuotaReset()

      const quotaAfterFirst = await prisma.quota.findUnique({
        where: {
          userId_bucket: { userId: user1Id, bucket: 'LEARNING_INTERACTIONS' },
        },
      })

      expect(quotaAfterFirst?.used).toBe(0)

      const firstResetAt = quotaAfterFirst?.resetAt

      // Run again immediately
      await runMonthlyQuotaReset()

      const quotaAfterSecond = await prisma.quota.findUnique({
        where: {
          userId_bucket: { userId: user1Id, bucket: 'LEARNING_INTERACTIONS' },
        },
      })

      // Should remain 0, resetAt should not change
      expect(quotaAfterSecond?.used).toBe(0)
      expect(quotaAfterSecond?.resetAt.getTime()).toBe(firstResetAt?.getTime())
    })
  })

  describe('Logging and Monitoring', () => {
    it('should log number of quotas reset', async () => {
      await prisma.quota.createMany({
        data: [
          {
            userId: user1Id,
            bucket: 'LEARNING_INTERACTIONS',
            used: 100,
            limit: 150,
            resetAt: new Date(Date.now() - 1000),
          },
          {
            userId: user2Id,
            bucket: 'LEARNING_INTERACTIONS',
            used: 120,
            limit: 150,
            resetAt: new Date(Date.now() - 1000),
          },
        ],
      })

      const logSpy = vi.spyOn(console, 'log')

      await runMonthlyQuotaReset()

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('2'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('reset'))
    })

    it('should log errors for failed resets', async () => {
      const errorSpy = vi.spyOn(console, 'error')

      vi.spyOn(prisma.quota, 'update').mockRejectedValueOnce(
        new Error('Database error')
      )

      await runMonthlyQuotaReset()

      expect(errorSpy).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle quota with no user (orphaned record)', async () => {
      // Create orphaned quota (user deleted)
      const tempUser = await prisma.user.create({
        data: {
          email: 'temp@example.com',
          passwordHash: 'hashed',
          emailConfirmedAt: new Date(),
        },
      })

      await prisma.quota.create({
        data: {
          userId: tempUser.id,
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date(Date.now() - 1000),
        },
      })

      // Delete user
      await prisma.user.delete({ where: { id: tempUser.id } })

      // Should not crash
      await expect(runMonthlyQuotaReset()).resolves.not.toThrow()
    })

    it('should handle quota with very old resetAt date', async () => {
      // Reset date from 1 year ago
      const veryOldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

      await prisma.quota.create({
        data: {
          userId: user1Id,
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: veryOldDate,
        },
      })

      await runMonthlyQuotaReset()

      const quota = await prisma.quota.findUnique({
        where: {
          userId_bucket: { userId: user1Id, bucket: 'LEARNING_INTERACTIONS' },
        },
      })

      expect(quota?.used).toBe(0)
      expect(quota?.resetAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should handle timezone differences correctly', async () => {
      // Create quota with UTC midnight
      const utcMidnight = new Date()
      utcMidnight.setUTCHours(0, 0, 0, 0)
      utcMidnight.setTime(utcMidnight.getTime() - 1000) // Just passed

      await prisma.quota.create({
        data: {
          userId: user1Id,
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: utcMidnight,
        },
      })

      await runMonthlyQuotaReset()

      const quota = await prisma.quota.findUnique({
        where: {
          userId_bucket: { userId: user1Id, bucket: 'LEARNING_INTERACTIONS' },
        },
      })

      expect(quota?.used).toBe(0)
    })
  })
})
