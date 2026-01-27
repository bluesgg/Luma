/**
 * Quota Management Utilities
 * Handles quota consumption, checking, and logging
 */

import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { QUOTA_LIMITS } from '@/lib/constants'
import type { QuotaBucket, QuotaChangeReason } from '@prisma/client'

/**
 * Get user's quota for a specific bucket
 * Fixed: Uses transaction to avoid race condition between reset check and quota fetch
 */
export async function getUserQuota(userId: string, bucket: QuotaBucket) {
  // Use transaction to handle reset atomically with quota fetch
  return await prisma.$transaction(async (tx) => {
    let quota = await tx.quota.findUnique({
      where: {
        userId_bucket: {
          userId,
          bucket,
        },
      },
    })

    // If quota doesn't exist, create it with default values
    if (!quota) {
      const limit =
        bucket === 'LEARNING_INTERACTIONS'
          ? QUOTA_LIMITS.LEARNING_INTERACTIONS
          : QUOTA_LIMITS.AUTO_EXPLAIN

      quota = await tx.quota.create({
        data: {
          userId,
          bucket,
          used: 0,
          limit,
          resetAt: calculateNextResetDate(),
        },
      })

      logger.info('Created quota for user', { userId, bucket, limit })
    }

    // Check if quota needs reset - perform within transaction
    if (new Date() >= new Date(quota.resetAt)) {
      const previousUsed = quota.used

      quota = await tx.quota.update({
        where: {
          userId_bucket: {
            userId,
            bucket,
          },
        },
        data: {
          used: 0,
          resetAt: calculateNextResetDate(),
        },
      })

      // Log reset within transaction
      await tx.quotaLog.create({
        data: {
          userId,
          bucket,
          change: 0,
          reason: 'SYSTEM_RESET',
          metadata: {
            previousUsed,
            timestamp: new Date().toISOString(),
            triggeredBy: 'getUserQuota',
          },
        },
      })

      logger.info('Quota reset in getUserQuota', { userId, bucket })
    }

    return quota
  })
}

/**
 * Check if user has enough quota
 */
export async function checkQuota(
  userId: string,
  bucket: QuotaBucket,
  required: number = 1
): Promise<{ allowed: boolean; remaining: number }> {
  const quota = await getUserQuota(userId, bucket)

  const remaining = quota.limit - quota.used
  const allowed = remaining >= required

  return { allowed, remaining }
}

/**
 * Consume quota with atomic transaction
 */
export async function consumeQuota(
  userId: string,
  bucket: QuotaBucket,
  amount: number = 1,
  metadata?: Record<string, any>
): Promise<{ success: boolean; remaining: number }> {
  // Handle edge case: zero or negative consumption
  if (amount <= 0) {
    const quota = await getUserQuota(userId, bucket)
    return { success: true, remaining: quota.limit - quota.used }
  }

  try {
    // Use transaction with serializable isolation for atomic operation
    // This ensures proper locking to prevent concurrent quota consumption issues
    const result = await prisma.$transaction(
      async (tx) => {
        // Get current quota within transaction
        // Note: Prisma doesn't support FOR UPDATE directly, but serializable isolation
        // provides equivalent protection against concurrent modifications
        let quota = await tx.quota.findUnique({
          where: {
            userId_bucket: {
              userId,
              bucket,
            },
          },
        })

        // Create quota if it doesn't exist
        if (!quota) {
          const limit =
            bucket === 'LEARNING_INTERACTIONS'
              ? QUOTA_LIMITS.LEARNING_INTERACTIONS
              : QUOTA_LIMITS.AUTO_EXPLAIN

          quota = await tx.quota.create({
            data: {
              userId,
              bucket,
              used: 0,
              limit,
              resetAt: calculateNextResetDate(),
            },
          })
        }

        // Check if quota needs reset
        if (new Date() >= new Date(quota.resetAt)) {
          quota = await tx.quota.update({
            where: {
              userId_bucket: {
                userId,
                bucket,
              },
            },
            data: {
              used: 0,
              resetAt: calculateNextResetDate(),
            },
          })

          // Log reset
          await tx.quotaLog.create({
            data: {
              userId,
              bucket,
              change: 0,
              reason: 'SYSTEM_RESET',
              metadata: { previousUsed: quota.used },
            },
          })
        }

        const newUsed = quota.used + amount
        const remaining = quota.limit - newUsed

        // Check if consumption would exceed limit
        if (newUsed > quota.limit) {
          logger.warn('Quota exceeded', {
            userId,
            bucket,
            used: newUsed,
            limit: quota.limit,
          })
          return {
            success: false,
            remaining: Math.max(0, quota.limit - quota.used),
          }
        }

        // Update quota
        await tx.quota.update({
          where: {
            userId_bucket: {
              userId,
              bucket,
            },
          },
          data: {
            used: newUsed,
          },
        })

        // Log consumption with enriched metadata
        const safeMetadata = metadata
          ? JSON.parse(JSON.stringify(metadata))
          : {}
        await tx.quotaLog.create({
          data: {
            userId,
            bucket,
            change: -amount,
            reason: 'CONSUME',
            metadata: {
              ...safeMetadata,
              timestamp: new Date().toISOString(),
              amount,
              remainingAfter: remaining,
              usedAfter: newUsed,
              limit: quota.limit,
            },
          },
        })

        return { success: true, remaining }
      },
      {
        isolationLevel: 'Serializable', // Strongest isolation to prevent race conditions
        maxWait: 5000, // Wait up to 5s for a transaction slot
        timeout: 10000, // Transaction timeout of 10s
      }
    )

    if (result.success) {
      logger.info('Quota consumed', {
        userId,
        bucket,
        amount,
        remaining: result.remaining,
      })
    }

    return result
  } catch (error) {
    logger.error('Failed to consume quota', { error, userId, bucket, amount })
    throw error
  }
}

/**
 * Refund quota (e.g., on error)
 * Fixed: Entire operation wrapped in transaction to prevent data races
 */
export async function refundQuota(
  userId: string,
  bucket: QuotaBucket,
  amount: number = 1,
  metadata?: Record<string, any>
): Promise<void> {
  // Handle edge case: negative refund amount
  if (amount < 0) {
    return
  }

  // Wrap entire refund operation in transaction for atomicity
  await prisma.$transaction(
    async (tx) => {
      // Get current quota within transaction
      const quota = await tx.quota.findUnique({
        where: {
          userId_bucket: {
            userId,
            bucket,
          },
        },
      })

      if (!quota) {
        logger.warn('Attempted to refund quota for non-existent quota record', {
          userId,
          bucket,
        })
        return
      }

      const newUsed = Math.max(0, quota.used - amount)

      // Update quota
      await tx.quota.update({
        where: {
          userId_bucket: {
            userId,
            bucket,
          },
        },
        data: {
          used: newUsed,
        },
      })

      // Log refund within transaction
      const safeMetadata = metadata ? JSON.parse(JSON.stringify(metadata)) : {}
      await tx.quotaLog.create({
        data: {
          userId,
          bucket,
          change: amount,
          reason: 'REFUND',
          metadata: {
            ...safeMetadata,
            timestamp: new Date().toISOString(),
            previousUsed: quota.used,
            newUsed,
          },
        },
      })
    },
    {
      isolationLevel: 'Serializable',
    }
  )

  logger.info('Quota refunded', { userId, bucket, amount })
}

/**
 * Reset quota to 0 usage
 * Fixed: Entire operation wrapped in transaction to prevent race conditions
 */
export async function resetQuota(userId: string, bucket: QuotaBucket) {
  // Wrap entire reset operation in transaction for atomicity
  const quota = await prisma.$transaction(
    async (tx) => {
      // Get current quota within transaction
      let currentQuota = await tx.quota.findUnique({
        where: {
          userId_bucket: {
            userId,
            bucket,
          },
        },
      })

      // If quota doesn't exist, create it first
      if (!currentQuota) {
        const limit =
          bucket === 'LEARNING_INTERACTIONS'
            ? QUOTA_LIMITS.LEARNING_INTERACTIONS
            : QUOTA_LIMITS.AUTO_EXPLAIN

        currentQuota = await tx.quota.create({
          data: {
            userId,
            bucket,
            used: 0,
            limit,
            resetAt: calculateNextResetDate(),
          },
        })

        logger.info('Created quota during reset', { userId, bucket, limit })
      }

      const previousUsed = currentQuota.used

      // Update quota within transaction
      const updatedQuota = await tx.quota.update({
        where: {
          userId_bucket: {
            userId,
            bucket,
          },
        },
        data: {
          used: 0,
          resetAt: calculateNextResetDate(),
        },
      })

      // Log reset within transaction
      await tx.quotaLog.create({
        data: {
          userId,
          bucket,
          change: 0,
          reason: 'SYSTEM_RESET',
          metadata: {
            previousUsed,
            timestamp: new Date().toISOString(),
            triggeredBy: 'resetQuota',
          },
        },
      })

      return updatedQuota
    },
    {
      isolationLevel: 'Serializable',
    }
  )

  logger.info('Quota reset', { userId, bucket })

  return quota
}

/**
 * Manually adjust quota (admin action)
 */
export async function adjustQuota(
  userId: string,
  bucket: QuotaBucket,
  newLimit: number,
  adminId: string,
  reason?: string
): Promise<void> {
  const quota = await getUserQuota(userId, bucket)

  await prisma.quota.update({
    where: {
      userId_bucket: {
        userId,
        bucket,
      },
    },
    data: {
      limit: newLimit,
    },
  })

  await logQuotaChange(userId, bucket, newLimit - quota.limit, 'ADMIN_ADJUST', {
    adminId,
    reason,
    previousLimit: quota.limit,
    newLimit,
  })

  logger.info('Quota adjusted by admin', {
    userId,
    bucket,
    previousLimit: quota.limit,
    newLimit,
    adminId,
  })
}

/**
 * Get all quotas for a user
 */
export async function getUserQuotas(userId: string) {
  const quotas = await Promise.all([
    getUserQuota(userId, 'LEARNING_INTERACTIONS'),
    getUserQuota(userId, 'AUTO_EXPLAIN'),
  ])

  return {
    learningInteractions: quotas[0],
    autoExplain: quotas[1],
  }
}

/**
 * Log quota change
 * Enhanced with timestamp and context information for better tracking
 */
async function logQuotaChange(
  userId: string,
  bucket: QuotaBucket,
  change: number,
  reason: QuotaChangeReason,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Ensure metadata is a plain object and doesn't contain functions or circular references
    const safeMetadata = metadata ? JSON.parse(JSON.stringify(metadata)) : {}

    // Enrich metadata with timestamp and additional context
    const enrichedMetadata = {
      ...safeMetadata,
      timestamp: new Date().toISOString(),
      changeAmount: change,
      source: safeMetadata.source || 'system',
      // Include stack trace context for debugging (first 3 frames)
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n'),
    }

    await prisma.quotaLog.create({
      data: {
        userId,
        bucket,
        change,
        reason,
        metadata: enrichedMetadata,
      },
    })
  } catch (error) {
    logger.error('Failed to log quota change', error)
    // Don't throw - logging failure shouldn't break main flow
  }
}

/**
 * Calculate next reset date with edge case handling
 * Handles cases like Jan 31 -> Feb 28/29, Feb 29 (leap) -> Mar 29, etc.
 * Always resets to the 1st of the next month for consistency
 */
export function calculateNextResetDate(fromDate?: Date): Date {
  const now = fromDate || new Date()
  // Always reset to the 1st of next month for consistency
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return nextMonth
}

/**
 * Initialize quotas for a new user
 * Creates both LEARNING_INTERACTIONS and AUTO_EXPLAIN quota buckets
 */
export async function initializeUserQuotas(userId: string): Promise<void> {
  const resetAt = calculateNextResetDate()

  await prisma.quota.createMany({
    data: [
      {
        userId,
        bucket: 'LEARNING_INTERACTIONS',
        used: 0,
        limit: QUOTA_LIMITS.LEARNING_INTERACTIONS,
        resetAt,
      },
      {
        userId,
        bucket: 'AUTO_EXPLAIN',
        used: 0,
        limit: QUOTA_LIMITS.AUTO_EXPLAIN,
        resetAt,
      },
    ],
    skipDuplicates: true, // Skip if already exists
  })

  logger.info('User quotas initialized', { userId })
}

/**
 * Get quota usage statistics for a user
 * Returns resetAt as ISO string for proper JSON serialization
 */
export async function getQuotaStats(userId: string) {
  const quotas = await getUserQuotas(userId)

  return {
    learningInteractions: {
      used: quotas.learningInteractions.used,
      limit: quotas.learningInteractions.limit,
      remaining:
        quotas.learningInteractions.limit - quotas.learningInteractions.used,
      percentage: Math.round(
        (quotas.learningInteractions.used / quotas.learningInteractions.limit) *
          100
      ),
      resetAt: quotas.learningInteractions.resetAt.toISOString(), // Serialize to string
    },
    autoExplain: {
      used: quotas.autoExplain.used,
      limit: quotas.autoExplain.limit,
      remaining: quotas.autoExplain.limit - quotas.autoExplain.used,
      percentage: Math.round(
        (quotas.autoExplain.used / quotas.autoExplain.limit) * 100
      ),
      resetAt: quotas.autoExplain.resetAt.toISOString(), // Serialize to string
    },
  }
}

/**
 * Check if quota is low (< 20% remaining)
 */
export function isQuotaLow(used: number, limit: number): boolean {
  const remaining = limit - used
  const percentage = (remaining / limit) * 100
  return percentage < 20
}

/**
 * Check if quota is exceeded
 */
export function isQuotaExceeded(used: number, limit: number): boolean {
  return used >= limit
}
