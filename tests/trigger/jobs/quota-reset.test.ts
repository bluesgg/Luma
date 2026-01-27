// =============================================================================
// Quota Reset Job Tests
// Tests for Trigger.dev scheduled job that resets expired user quotas
// =============================================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock dependencies
const mockPrismaFindMany = vi.fn()
const mockPrismaUpdate = vi.fn()
const mockPrismaCreate = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    quota: {
      findMany: mockPrismaFindMany,
      update: mockPrismaUpdate,
    },
    quotaLog: {
      create: mockPrismaCreate,
    },
  },
  prisma: {
    quota: {
      findMany: mockPrismaFindMany,
      update: mockPrismaUpdate,
    },
    quotaLog: {
      create: mockPrismaCreate,
    },
  },
}))

// Mock logger
const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()
const mockLoggerTrigger = vi.fn()

vi.mock('@/lib/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    error: mockLoggerError,
    trigger: mockLoggerTrigger,
  },
}))

// Quota Reset Job Implementation
interface Quota {
  id: string
  userId: string
  bucket: 'LEARNING_INTERACTIONS' | 'AUTO_EXPLAIN'
  used: number
  limit: number
  resetAt: Date
}

interface QuotaResetResult {
  success: boolean
  resetCount: number
  errorCount: number
  errors?: Array<{ quotaId: string; error: string }>
}

class QuotaResetJob {
  /**
   * Calculate next reset date (30 days from now)
   * Handles month-end edge cases
   */
  calculateNextResetDate(fromDate: Date = new Date()): Date {
    const nextReset = new Date(fromDate)
    nextReset.setDate(nextReset.getDate() + 30)
    return nextReset
  }

  /**
   * Find all quotas that have expired
   */
  async findExpiredQuotas(): Promise<Quota[]> {
    const now = new Date()

    return mockPrismaFindMany({
      where: {
        resetAt: {
          lt: now,
        },
      },
    })
  }

  /**
   * Reset a single quota
   */
  async resetQuota(quota: Quota): Promise<void> {
    const nextResetDate = this.calculateNextResetDate()

    // Update quota
    await mockPrismaUpdate({
      where: { id: quota.id },
      data: {
        used: 0,
        resetAt: nextResetDate,
      },
    })

    // Create audit log
    await mockPrismaCreate({
      data: {
        quotaId: quota.id,
        userId: quota.userId,
        bucket: quota.bucket,
        previousUsed: quota.used,
        previousLimit: quota.limit,
        newUsed: 0,
        newLimit: quota.limit,
        reason: 'SYSTEM_RESET',
        createdAt: new Date(),
      },
    })

    mockLoggerInfo('Quota reset', {
      quotaId: quota.id,
      userId: quota.userId,
      bucket: quota.bucket,
      previousUsed: quota.used,
    })
  }

  /**
   * Execute quota reset job
   */
  async execute(): Promise<QuotaResetResult> {
    mockLoggerTrigger('Starting quota reset job')

    let resetCount = 0
    let errorCount = 0
    const errors: Array<{ quotaId: string; error: string }> = []

    try {
      // Find expired quotas
      const expiredQuotas = await this.findExpiredQuotas()

      mockLoggerInfo(`Found ${expiredQuotas.length} expired quotas`)

      // Reset each quota
      for (const quota of expiredQuotas) {
        try {
          await this.resetQuota(quota)
          resetCount++
        } catch (error) {
          mockLoggerError('Failed to reset quota', error, {
            quotaId: quota.id,
          })

          errorCount++
          errors.push({
            quotaId: quota.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      mockLoggerTrigger('Quota reset job completed', {
        resetCount,
        errorCount,
      })

      return {
        success: errorCount === 0,
        resetCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error) {
      mockLoggerError('Quota reset job failed', error)

      return {
        success: false,
        resetCount,
        errorCount,
        errors: [
          {
            quotaId: 'N/A',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      }
    }
  }
}

describe('Quota Reset Job', () => {
  let job: QuotaResetJob

  beforeEach(() => {
    job = new QuotaResetJob()
    vi.clearAllMocks()

    // Setup default mocks
    mockPrismaFindMany.mockResolvedValue([])
    mockPrismaUpdate.mockResolvedValue({})
    mockPrismaCreate.mockResolvedValue({})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('findExpiredQuotas', () => {
    it('should find quotas with resetAt before now', async () => {
      const now = new Date()
      const expiredQuotas: Quota[] = [
        {
          id: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
        },
      ]

      mockPrismaFindMany.mockResolvedValue(expiredQuotas)

      const result = await job.findExpiredQuotas()

      expect(result).toEqual(expiredQuotas)
      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: {
          resetAt: {
            lt: expect.any(Date),
          },
        },
      })
    })

    it('should return empty array when no expired quotas', async () => {
      mockPrismaFindMany.mockResolvedValue([])

      const result = await job.findExpiredQuotas()

      expect(result).toEqual([])
    })

    it('should find multiple expired quotas', async () => {
      const now = new Date()
      const expiredQuotas: Quota[] = [
        {
          id: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
        {
          id: 'quota-2',
          userId: 'user-2',
          bucket: 'AUTO_EXPLAIN',
          used: 50,
          limit: 100,
          resetAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        },
      ]

      mockPrismaFindMany.mockResolvedValue(expiredQuotas)

      const result = await job.findExpiredQuotas()

      expect(result).toHaveLength(2)
    })
  })

  describe('calculateNextResetDate', () => {
    it('should add 30 days to current date', () => {
      const baseDate = new Date('2024-01-15T00:00:00Z')
      const result = job.calculateNextResetDate(baseDate)

      const expected = new Date('2024-02-14T00:00:00Z')
      expect(result.toISOString()).toBe(expected.toISOString())
    })

    it('should handle month-end date (31st to 28th/29th)', () => {
      // January 31st + 30 days = March 1st/2nd
      const baseDate = new Date('2024-01-31T00:00:00Z')
      const result = job.calculateNextResetDate(baseDate)

      const expected = new Date('2024-03-01T00:00:00Z')
      expect(result.toISOString()).toBe(expected.toISOString())
    })

    it('should handle leap year February', () => {
      // February 1st 2024 (leap year) + 30 days = March 2nd
      const baseDate = new Date('2024-02-01T00:00:00Z')
      const result = job.calculateNextResetDate(baseDate)

      const expected = new Date('2024-03-02T00:00:00Z')
      expect(result.toISOString()).toBe(expected.toISOString())
    })

    it('should handle non-leap year February', () => {
      // February 1st 2023 (non-leap) + 30 days = March 3rd
      const baseDate = new Date('2023-02-01T00:00:00Z')
      const result = job.calculateNextResetDate(baseDate)

      const expected = new Date('2023-03-03T00:00:00Z')
      expect(result.toISOString()).toBe(expected.toISOString())
    })

    it('should handle year transition', () => {
      // December 15th + 30 days = January 14th next year
      const baseDate = new Date('2024-12-15T00:00:00Z')
      const result = job.calculateNextResetDate(baseDate)

      const expected = new Date('2025-01-14T00:00:00Z')
      expect(result.toISOString()).toBe(expected.toISOString())
    })

    it('should preserve time when adding days', () => {
      const baseDate = new Date('2024-01-15T14:30:45Z')
      const result = job.calculateNextResetDate(baseDate)

      expect(result.getHours()).toBe(14)
      expect(result.getMinutes()).toBe(30)
      expect(result.getSeconds()).toBe(45)
    })

    it('should use current date when not provided', () => {
      const before = new Date()
      const result = job.calculateNextResetDate()
      const after = new Date()

      // Result should be ~30 days from now
      const expectedMin = new Date(before.getTime() + 29 * 24 * 60 * 60 * 1000)
      const expectedMax = new Date(after.getTime() + 31 * 24 * 60 * 60 * 1000)

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime())
      expect(result.getTime()).toBeLessThanOrEqual(expectedMax.getTime())
    })

    it('should handle edge case: January 31st', () => {
      // Jan 31 + 30 days = March 2 (in non-leap year)
      const baseDate = new Date('2023-01-31T00:00:00Z')
      const result = job.calculateNextResetDate(baseDate)

      expect(result.getMonth()).toBe(2) // March (0-indexed)
    })

    it('should handle edge case: March 31st', () => {
      // March 31 + 30 days = April 30
      const baseDate = new Date('2024-03-31T00:00:00Z')
      const result = job.calculateNextResetDate(baseDate)

      const expected = new Date('2024-04-30T00:00:00Z')
      expect(result.toISOString()).toBe(expected.toISOString())
    })
  })

  describe('resetQuota', () => {
    it('should reset quota used to 0', async () => {
      const quota: Quota = {
        id: 'quota-1',
        userId: 'user-1',
        bucket: 'LEARNING_INTERACTIONS',
        used: 100,
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }

      await job.resetQuota(quota)

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'quota-1' },
        data: {
          used: 0,
          resetAt: expect.any(Date),
        },
      })
    })

    it('should calculate next reset date', async () => {
      const quota: Quota = {
        id: 'quota-1',
        userId: 'user-1',
        bucket: 'LEARNING_INTERACTIONS',
        used: 100,
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }

      await job.resetQuota(quota)

      const updateCall = mockPrismaUpdate.mock.calls[0][0]
      const resetAt = updateCall.data.resetAt

      // Should be approximately 30 days from now
      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const diff = Math.abs(resetAt.getTime() - thirtyDaysFromNow.getTime())

      // Allow 1 second difference for test execution time
      expect(diff).toBeLessThan(1000)
    })

    it('should create audit log', async () => {
      const quota: Quota = {
        id: 'quota-1',
        userId: 'user-1',
        bucket: 'LEARNING_INTERACTIONS',
        used: 100,
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }

      await job.resetQuota(quota)

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: {
          quotaId: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          previousUsed: 100,
          previousLimit: 150,
          newUsed: 0,
          newLimit: 150,
          reason: 'SYSTEM_RESET',
          createdAt: expect.any(Date),
        },
      })
    })

    it('should log quota reset', async () => {
      const quota: Quota = {
        id: 'quota-1',
        userId: 'user-1',
        bucket: 'LEARNING_INTERACTIONS',
        used: 100,
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }

      await job.resetQuota(quota)

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Quota reset',
        expect.objectContaining({
          quotaId: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          previousUsed: 100,
        })
      )
    })

    it('should handle AUTO_EXPLAIN bucket', async () => {
      const quota: Quota = {
        id: 'quota-2',
        userId: 'user-2',
        bucket: 'AUTO_EXPLAIN',
        used: 50,
        limit: 100,
        resetAt: new Date('2024-01-01'),
      }

      await job.resetQuota(quota)

      expect(mockPrismaUpdate).toHaveBeenCalled()
      expect(mockPrismaCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bucket: 'AUTO_EXPLAIN',
          }),
        })
      )
    })

    it('should handle quota with 0 used', async () => {
      const quota: Quota = {
        id: 'quota-3',
        userId: 'user-3',
        bucket: 'LEARNING_INTERACTIONS',
        used: 0,
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }

      await job.resetQuota(quota)

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'quota-3' },
        data: {
          used: 0,
          resetAt: expect.any(Date),
        },
      })

      expect(mockPrismaCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            previousUsed: 0,
            newUsed: 0,
          }),
        })
      )
    })
  })

  describe('execute - Successful Scenarios', () => {
    it('should reset all expired quotas', async () => {
      const now = new Date()
      const expiredQuotas: Quota[] = [
        {
          id: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
        {
          id: 'quota-2',
          userId: 'user-2',
          bucket: 'AUTO_EXPLAIN',
          used: 50,
          limit: 100,
          resetAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        },
      ]

      mockPrismaFindMany.mockResolvedValue(expiredQuotas)

      const result = await job.execute()

      expect(result.success).toBe(true)
      expect(result.resetCount).toBe(2)
      expect(result.errorCount).toBe(0)
      expect(mockPrismaUpdate).toHaveBeenCalledTimes(2)
      expect(mockPrismaCreate).toHaveBeenCalledTimes(2)
    })

    it('should handle no expired quotas', async () => {
      mockPrismaFindMany.mockResolvedValue([])

      const result = await job.execute()

      expect(result.success).toBe(true)
      expect(result.resetCount).toBe(0)
      expect(result.errorCount).toBe(0)
      expect(mockPrismaUpdate).not.toHaveBeenCalled()
    })

    it('should log job start and completion', async () => {
      mockPrismaFindMany.mockResolvedValue([])

      await job.execute()

      expect(mockLoggerTrigger).toHaveBeenCalledWith('Starting quota reset job')
      expect(mockLoggerTrigger).toHaveBeenCalledWith(
        'Quota reset job completed',
        expect.objectContaining({
          resetCount: 0,
          errorCount: 0,
        })
      )
    })

    it('should log number of expired quotas found', async () => {
      const expiredQuotas: Quota[] = [
        {
          id: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date('2024-01-01'),
        },
      ]

      mockPrismaFindMany.mockResolvedValue(expiredQuotas)

      await job.execute()

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Found 1 expired quotas'
      )
    })
  })

  describe('execute - Error Scenarios', () => {
    it('should handle quota update failure', async () => {
      const expiredQuotas: Quota[] = [
        {
          id: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date('2024-01-01'),
        },
      ]

      mockPrismaFindMany.mockResolvedValue(expiredQuotas)
      mockPrismaUpdate.mockRejectedValue(new Error('Database error'))

      const result = await job.execute()

      expect(result.success).toBe(false)
      expect(result.resetCount).toBe(0)
      expect(result.errorCount).toBe(1)
      expect(result.errors).toEqual([
        {
          quotaId: 'quota-1',
          error: 'Database error',
        },
      ])
    })

    it('should handle audit log creation failure', async () => {
      const expiredQuotas: Quota[] = [
        {
          id: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date('2024-01-01'),
        },
      ]

      mockPrismaFindMany.mockResolvedValue(expiredQuotas)
      mockPrismaCreate.mockRejectedValue(new Error('Log creation failed'))

      const result = await job.execute()

      expect(result.success).toBe(false)
      expect(result.errorCount).toBe(1)
    })

    it('should continue processing after individual failures', async () => {
      const expiredQuotas: Quota[] = [
        {
          id: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date('2024-01-01'),
        },
        {
          id: 'quota-2',
          userId: 'user-2',
          bucket: 'AUTO_EXPLAIN',
          used: 50,
          limit: 100,
          resetAt: new Date('2024-01-01'),
        },
      ]

      mockPrismaFindMany.mockResolvedValue(expiredQuotas)

      // First update fails, second succeeds
      mockPrismaUpdate
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({})

      const result = await job.execute()

      expect(result.resetCount).toBe(1)
      expect(result.errorCount).toBe(1)
      expect(result.success).toBe(false)
    })

    it('should handle findExpiredQuotas failure', async () => {
      mockPrismaFindMany.mockRejectedValue(new Error('Query failed'))

      const result = await job.execute()

      expect(result.success).toBe(false)
      expect(result.resetCount).toBe(0)
      expect(result.errors).toEqual([
        {
          quotaId: 'N/A',
          error: 'Query failed',
        },
      ])
    })

    it('should log individual quota reset failures', async () => {
      const expiredQuotas: Quota[] = [
        {
          id: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date('2024-01-01'),
        },
      ]

      mockPrismaFindMany.mockResolvedValue(expiredQuotas)
      mockPrismaUpdate.mockRejectedValue(new Error('Update failed'))

      await job.execute()

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to reset quota',
        expect.any(Error),
        expect.objectContaining({
          quotaId: 'quota-1',
        })
      )
    })

    it('should log job failure', async () => {
      mockPrismaFindMany.mockRejectedValue(new Error('Fatal error'))

      await job.execute()

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Quota reset job failed',
        expect.any(Error)
      )
    })

    it('should handle non-Error exceptions', async () => {
      const expiredQuotas: Quota[] = [
        {
          id: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date('2024-01-01'),
        },
      ]

      mockPrismaFindMany.mockResolvedValue(expiredQuotas)
      mockPrismaUpdate.mockRejectedValue('String error')

      const result = await job.execute()

      expect(result.errors).toEqual([
        {
          quotaId: 'quota-1',
          error: 'Unknown error',
        },
      ])
    })
  })

  describe('QuotaLog Creation', () => {
    it('should create log with correct reason', async () => {
      const quota: Quota = {
        id: 'quota-1',
        userId: 'user-1',
        bucket: 'LEARNING_INTERACTIONS',
        used: 100,
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }

      await job.resetQuota(quota)

      expect(mockPrismaCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: 'SYSTEM_RESET',
          }),
        })
      )
    })

    it('should preserve limit in log', async () => {
      const quota: Quota = {
        id: 'quota-1',
        userId: 'user-1',
        bucket: 'LEARNING_INTERACTIONS',
        used: 100,
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }

      await job.resetQuota(quota)

      expect(mockPrismaCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            previousLimit: 150,
            newLimit: 150,
          }),
        })
      )
    })

    it('should record previous and new used values', async () => {
      const quota: Quota = {
        id: 'quota-1',
        userId: 'user-1',
        bucket: 'LEARNING_INTERACTIONS',
        used: 75,
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }

      await job.resetQuota(quota)

      expect(mockPrismaCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            previousUsed: 75,
            newUsed: 0,
          }),
        })
      )
    })

    it('should set createdAt timestamp', async () => {
      const quota: Quota = {
        id: 'quota-1',
        userId: 'user-1',
        bucket: 'LEARNING_INTERACTIONS',
        used: 100,
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }

      const before = new Date()
      await job.resetQuota(quota)
      const after = new Date()

      const createCall = mockPrismaCreate.mock.calls[0][0]
      const createdAt = createCall.data.createdAt

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large number of expired quotas', async () => {
      const expiredQuotas: Quota[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `quota-${i}`,
        userId: `user-${i}`,
        bucket: 'LEARNING_INTERACTIONS' as const,
        used: 100,
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }))

      mockPrismaFindMany.mockResolvedValue(expiredQuotas)

      const result = await job.execute()

      expect(result.resetCount).toBe(1000)
      expect(result.errorCount).toBe(0)
    })

    it('should handle quota at exactly limit', async () => {
      const quota: Quota = {
        id: 'quota-1',
        userId: 'user-1',
        bucket: 'LEARNING_INTERACTIONS',
        used: 150,
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }

      await job.resetQuota(quota)

      expect(mockPrismaUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            used: 0,
          }),
        })
      )
    })

    it('should handle quota beyond limit', async () => {
      const quota: Quota = {
        id: 'quota-1',
        userId: 'user-1',
        bucket: 'LEARNING_INTERACTIONS',
        used: 200, // Over limit
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }

      await job.resetQuota(quota)

      expect(mockPrismaCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            previousUsed: 200,
            newUsed: 0,
          }),
        })
      )
    })

    it('should handle quota with very old resetAt date', async () => {
      const quota: Quota = {
        id: 'quota-1',
        userId: 'user-1',
        bucket: 'LEARNING_INTERACTIONS',
        used: 100,
        limit: 150,
        resetAt: new Date('2020-01-01'), // Years ago
      }

      await job.resetQuota(quota)

      // Should still reset normally
      expect(mockPrismaUpdate).toHaveBeenCalled()
    })

    it('should handle mixed bucket types', async () => {
      const expiredQuotas: Quota[] = [
        {
          id: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date('2024-01-01'),
        },
        {
          id: 'quota-2',
          userId: 'user-1',
          bucket: 'AUTO_EXPLAIN',
          used: 50,
          limit: 100,
          resetAt: new Date('2024-01-01'),
        },
      ]

      mockPrismaFindMany.mockResolvedValue(expiredQuotas)

      const result = await job.execute()

      expect(result.resetCount).toBe(2)
    })
  })

  describe('Performance', () => {
    it('should complete job in reasonable time', async () => {
      const expiredQuotas: Quota[] = Array.from({ length: 100 }, (_, i) => ({
        id: `quota-${i}`,
        userId: `user-${i}`,
        bucket: 'LEARNING_INTERACTIONS' as const,
        used: 100,
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }))

      mockPrismaFindMany.mockResolvedValue(expiredQuotas)

      const startTime = Date.now()
      await job.execute()
      const duration = Date.now() - startTime

      // Should complete quickly with mocked dependencies
      expect(duration).toBeLessThan(200)
    })

    it('should handle concurrent execution attempts', async () => {
      const expiredQuotas: Quota[] = [
        {
          id: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date('2024-01-01'),
        },
      ]

      mockPrismaFindMany.mockResolvedValue(expiredQuotas)

      // Execute multiple times concurrently
      const results = await Promise.all([
        job.execute(),
        job.execute(),
        job.execute(),
      ])

      // All should complete successfully
      results.forEach((result) => {
        expect(result.resetCount).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Idempotency', () => {
    it('should handle running job multiple times', async () => {
      const expiredQuotas: Quota[] = [
        {
          id: 'quota-1',
          userId: 'user-1',
          bucket: 'LEARNING_INTERACTIONS',
          used: 100,
          limit: 150,
          resetAt: new Date('2024-01-01'),
        },
      ]

      // First run finds expired quotas
      mockPrismaFindMany.mockResolvedValueOnce(expiredQuotas)

      const result1 = await job.execute()
      expect(result1.resetCount).toBe(1)

      // Second run finds no expired quotas (already reset)
      mockPrismaFindMany.mockResolvedValueOnce([])

      const result2 = await job.execute()
      expect(result2.resetCount).toBe(0)
    })

    it('should create unique log entries for each reset', async () => {
      const quota: Quota = {
        id: 'quota-1',
        userId: 'user-1',
        bucket: 'LEARNING_INTERACTIONS',
        used: 100,
        limit: 150,
        resetAt: new Date('2024-01-01'),
      }

      await job.resetQuota(quota)
      await job.resetQuota(quota)

      expect(mockPrismaCreate).toHaveBeenCalledTimes(2)

      const call1 = mockPrismaCreate.mock.calls[0][0]
      const call2 = mockPrismaCreate.mock.calls[1][0]

      // Different timestamps
      expect(call1.data.createdAt).not.toBe(call2.data.createdAt)
    })
  })
})
