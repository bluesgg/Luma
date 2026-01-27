// =============================================================================
// Admin User Quota Adjustment API Tests (TDD - Phase 7)
// POST /api/admin/users/[id]/quota
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

async function adjustUserQuota(
  userId: string,
  data: {
    bucket: 'LEARNING_INTERACTIONS' | 'AUTO_EXPLAIN'
    action: 'set_limit' | 'adjust_used' | 'reset'
    value?: number
    reason: string
  },
  sessionCookie?: string
) {
  const headers: any = { 'Content-Type': 'application/json' }
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie
  }

  const response = await fetch(`/api/admin/users/${userId}/quota`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return { status: response.status, data: await response.json() }
}

describe('POST /api/admin/users/[id]/quota', () => {
  let userId: string
  let quotaId: string

  beforeEach(async () => {
    await prisma.quotaLog.deleteMany()
    await prisma.quota.deleteMany()
    await prisma.user.deleteMany()
    await prisma.admin.deleteMany()
    await prisma.auditLog.deleteMany()

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

    const quota = await prisma.quota.create({
      data: {
        userId,
        bucket: 'LEARNING_INTERACTIONS',
        used: 50,
        limit: 150,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
    quotaId = quota.id
  })

  afterEach(async () => {
    await prisma.quotaLog.deleteMany()
    await prisma.quota.deleteMany()
    await prisma.user.deleteMany()
    await prisma.admin.deleteMany()
    await prisma.auditLog.deleteMany()
  })

  describe('Authentication', () => {
    it('should require admin authentication', async () => {
      const response = await adjustUserQuota(userId, {
        bucket: 'LEARNING_INTERACTIONS',
        action: 'set_limit',
        value: 200,
        reason: 'Test adjustment',
      })

      expect(response.status).toBe(401)
    })

    it('should allow admin access', async () => {
      const response = await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'set_limit',
          value: 200,
          reason: 'Test adjustment',
        },
        'luma-admin-session=valid-token'
      )

      expect(response.status).toBe(200)
    })
  })

  describe('Set Limit Action', () => {
    it('should set new quota limit', async () => {
      await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'set_limit',
          value: 300,
          reason: 'Premium user upgrade',
        },
        'luma-admin-session=valid-token'
      )

      const quota = await prisma.quota.findFirst({
        where: { userId, bucket: 'LEARNING_INTERACTIONS' },
      })

      expect(quota?.limit).toBe(300)
    })

    it('should preserve used value when setting limit', async () => {
      await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'set_limit',
          value: 300,
          reason: 'Test',
        },
        'luma-admin-session=valid-token'
      )

      const quota = await prisma.quota.findFirst({
        where: { userId, bucket: 'LEARNING_INTERACTIONS' },
      })

      expect(quota?.used).toBe(50)
    })

    it('should require value for set_limit action', async () => {
      const response = await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'set_limit',
          reason: 'Test',
        } as any,
        'luma-admin-session=valid-token'
      )

      expect(response.status).toBe(400)
    })
  })

  describe('Adjust Used Action', () => {
    it('should adjust used quota (positive)', async () => {
      await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'adjust_used',
          value: 10,
          reason: 'Manual correction',
        },
        'luma-admin-session=valid-token'
      )

      const quota = await prisma.quota.findFirst({
        where: { userId, bucket: 'LEARNING_INTERACTIONS' },
      })

      expect(quota?.used).toBe(60)
    })

    it('should adjust used quota (negative)', async () => {
      await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'adjust_used',
          value: -20,
          reason: 'Refund',
        },
        'luma-admin-session=valid-token'
      )

      const quota = await prisma.quota.findFirst({
        where: { userId, bucket: 'LEARNING_INTERACTIONS' },
      })

      expect(quota?.used).toBe(30)
    })

    it('should not allow negative used value', async () => {
      await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'adjust_used',
          value: -100,
          reason: 'Test',
        },
        'luma-admin-session=valid-token'
      )

      const quota = await prisma.quota.findFirst({
        where: { userId, bucket: 'LEARNING_INTERACTIONS' },
      })

      expect(quota?.used).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Reset Action', () => {
    it('should reset used to 0', async () => {
      await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'reset',
          reason: 'Monthly reset',
        },
        'luma-admin-session=valid-token'
      )

      const quota = await prisma.quota.findFirst({
        where: { userId, bucket: 'LEARNING_INTERACTIONS' },
      })

      expect(quota?.used).toBe(0)
    })

    it('should not require value for reset action', async () => {
      const response = await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'reset',
          reason: 'Test',
        },
        'luma-admin-session=valid-token'
      )

      expect(response.status).toBe(200)
    })
  })

  describe('Logging', () => {
    it('should create QuotaLog entry', async () => {
      await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'set_limit',
          value: 200,
          reason: 'Admin adjustment',
        },
        'luma-admin-session=valid-token'
      )

      const log = await prisma.quotaLog.findFirst({
        where: { userId, bucket: 'LEARNING_INTERACTIONS' },
      })

      expect(log).toBeDefined()
      expect(log?.reason).toBe('ADMIN_ADJUST')
      expect(log?.metadata).toMatchObject({ reason: 'Admin adjustment' })
    })

    it('should create AuditLog entry', async () => {
      await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'set_limit',
          value: 200,
          reason: 'Admin adjustment',
        },
        'luma-admin-session=valid-token'
      )

      const auditLog = await prisma.auditLog.findFirst({
        where: { action: 'QUOTA_ADJUST' },
      })

      expect(auditLog).toBeDefined()
    })
  })

  describe('Validation', () => {
    it('should reject invalid bucket', async () => {
      const response = await adjustUserQuota(
        userId,
        {
          bucket: 'INVALID_BUCKET' as any,
          action: 'set_limit',
          value: 200,
          reason: 'Test',
        },
        'luma-admin-session=valid-token'
      )

      expect(response.status).toBe(400)
    })

    it('should reject invalid action', async () => {
      const response = await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'invalid_action' as any,
          value: 200,
          reason: 'Test',
        },
        'luma-admin-session=valid-token'
      )

      expect(response.status).toBe(400)
    })

    it('should require reason field', async () => {
      const response = await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'set_limit',
          value: 200,
        } as any,
        'luma-admin-session=valid-token'
      )

      expect(response.status).toBe(400)
    })

    it('should reject non-existent user', async () => {
      const response = await adjustUserQuota(
        'non-existent-id',
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'set_limit',
          value: 200,
          reason: 'Test',
        },
        'luma-admin-session=valid-token'
      )

      expect(response.status).toBe(404)
    })

    it('should reject negative limit', async () => {
      const response = await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'set_limit',
          value: -10,
          reason: 'Test',
        },
        'luma-admin-session=valid-token'
      )

      expect(response.status).toBe(400)
    })
  })

  describe('Response Format', () => {
    it('should return updated quota in response', async () => {
      const response = await adjustUserQuota(
        userId,
        {
          bucket: 'LEARNING_INTERACTIONS',
          action: 'set_limit',
          value: 200,
          reason: 'Test',
        },
        'luma-admin-session=valid-token'
      )

      expect(response.data.data.quota).toBeDefined()
      expect(response.data.data.quota.limit).toBe(200)
    })
  })
})
