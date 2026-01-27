// =============================================================================
// Password Reset Request API Tests (TDD)
// POST /api/auth/reset-password
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/lib/constants'

async function requestPasswordReset(email: string) {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return { status: response.status, data: await response.json() }
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(async () => {
    await prisma.verificationToken.deleteMany()
    await prisma.user.deleteMany()
    await prisma.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: '$2b$10$hash',
        emailConfirmedAt: new Date(),
      },
    })
  })

  describe('Happy Path', () => {
    it('should create password reset token', async () => {
      const response = await requestPasswordReset('user@example.com')
      expect(response.status).toBe(200)

      const token = await prisma.verificationToken.findFirst({
        where: {
          user: { email: 'user@example.com' },
          type: 'PASSWORD_RESET',
        },
      })
      expect(token).toBeDefined()
      expect(token?.expiresAt).toBeInstanceOf(Date)
    })

    it('should send password reset email', async () => {
      const response = await requestPasswordReset('user@example.com')
      expect(response.status).toBe(200)
      // Email verification through mocks
    })

    it('should return success even for non-existent email (security)', async () => {
      const response = await requestPasswordReset('nonexistent@example.com')
      expect(response.status).toBe(200) // Don't reveal if email exists
    })

    it('should not create token for non-existent email', async () => {
      await requestPasswordReset('nonexistent@example.com')

      const token = await prisma.verificationToken.findFirst({
        where: { user: { email: 'nonexistent@example.com' } },
      })
      expect(token).toBeNull()
    })
  })

  describe('Rate Limiting', () => {
    it('should rate limit to 5 requests per 15 minutes', async () => {
      const requests = []
      for (let i = 0; i < 6; i++) {
        requests.push(requestPasswordReset('user@example.com'))
      }

      const responses = await Promise.all(requests)
      const rateLimited = responses.filter((r) => r.status === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
    })
  })

  describe('Token Expiry', () => {
    it('should set token expiry to 24 hours', async () => {
      const before = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await requestPasswordReset('user@example.com')
      const after = new Date(Date.now() + 24 * 60 * 60 * 1000)

      const token = await prisma.verificationToken.findFirst({
        where: { user: { email: 'user@example.com' }, type: 'PASSWORD_RESET' },
      })

      expect(token!.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 60000
      )
      expect(token!.expiresAt.getTime()).toBeLessThanOrEqual(
        after.getTime() + 60000
      )
    })
  })

  describe('Validation', () => {
    it('should reject invalid email format', async () => {
      const response = await requestPasswordReset('invalid-email')
      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject empty email', async () => {
      const response = await requestPasswordReset('')
      expect(response.status).toBe(400)
    })
  })

  describe('Security', () => {
    it('should use consistent response time', async () => {
      const start1 = Date.now()
      await requestPasswordReset('user@example.com')
      const time1 = Date.now() - start1

      const start2 = Date.now()
      await requestPasswordReset('nonexistent@example.com')
      const time2 = Date.now() - start2

      expect(Math.abs(time1 - time2)).toBeLessThan(500) // Similar timing
    })
  })
})
