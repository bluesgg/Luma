// =============================================================================
// Email Verification API Tests (TDD)
// GET /api/auth/verify?token=...
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/lib/constants'

async function verifyEmail(token: string) {
  const response = await fetch(`/api/auth/verify?token=${token}`)
  return {
    status: response.status,
    data: await response.json(),
  }
}

describe('GET /api/auth/verify', () => {
  let testUser: any
  let validToken: string

  beforeEach(async () => {
    await prisma.verificationToken.deleteMany()
    await prisma.user.deleteMany()

    testUser = await prisma.user.create({
      data: {
        email: 'unverified@example.com',
        passwordHash: '$2b$10$hashedpassword',
        emailConfirmedAt: null,
      },
    })

    const tokenRecord = await prisma.verificationToken.create({
      data: {
        userId: testUser.id,
        token: 'valid-token-123',
        type: 'EMAIL_VERIFY',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
    validToken = tokenRecord.token
  })

  describe('Happy Path', () => {
    it('should verify email with valid token', async () => {
      const response = await verifyEmail(validToken)
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })

    it('should update email_confirmed_at timestamp', async () => {
      const before = new Date()
      await verifyEmail(validToken)
      const after = new Date()

      const user = await prisma.user.findUnique({ where: { id: testUser.id } })
      expect(user?.emailConfirmedAt).toBeDefined()
      expect(user!.emailConfirmedAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      )
      expect(user!.emailConfirmedAt!.getTime()).toBeLessThanOrEqual(
        after.getTime()
      )
    })

    it('should mark token as used', async () => {
      await verifyEmail(validToken)

      const token = await prisma.verificationToken.findUnique({
        where: { token: validToken },
      })
      expect(token?.usedAt).toBeDefined()
    })

    it('should return success message', async () => {
      const response = await verifyEmail(validToken)
      expect(response.data.data.message).toContain('verified')
    })
  })

  describe('Invalid Token', () => {
    it('should reject non-existent token', async () => {
      const response = await verifyEmail('non-existent-token')
      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_TOKEN_INVALID)
    })

    it('should reject already used token', async () => {
      await verifyEmail(validToken) // First use

      const response = await verifyEmail(validToken) // Second use
      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_TOKEN_INVALID)
    })

    it('should reject expired token', async () => {
      const expiredToken = await prisma.verificationToken.create({
        data: {
          userId: testUser.id,
          token: 'expired-token',
          type: 'EMAIL_VERIFY',
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      })

      const response = await verifyEmail(expiredToken.token)
      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_TOKEN_EXPIRED)
    })

    it('should reject empty token', async () => {
      const response = await verifyEmail('')
      expect(response.status).toBe(400)
    })

    it('should reject missing token query parameter', async () => {
      const response = await fetch('/api/auth/verify')
      expect(response.status).toBe(400)
    })
  })

  describe('Token Type Validation', () => {
    it('should reject PASSWORD_RESET token for email verification', async () => {
      const resetToken = await prisma.verificationToken.create({
        data: {
          userId: testUser.id,
          token: 'reset-token',
          type: 'PASSWORD_RESET', // Wrong type
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      const response = await verifyEmail(resetToken.token)
      expect(response.status).toBe(400)
    })
  })

  describe('Already Verified', () => {
    it('should handle already verified email gracefully', async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { emailConfirmedAt: new Date() },
      })

      const response = await verifyEmail(validToken)
      // Can either succeed or return informative message
      expect([200, 400]).toContain(response.status)
    })
  })

  describe('Security', () => {
    it('should use GET method', async () => {
      const response = await fetch(`/api/auth/verify?token=${validToken}`, {
        method: 'POST',
      })
      expect(response.status).toBe(405)
    })

    it('should rate limit verification attempts', async () => {
      const requests = []
      for (let i = 0; i < 15; i++) {
        requests.push(verifyEmail('random-token-' + i))
      }

      const responses = await Promise.all(requests)
      const rateLimited = responses.some((r) => r.status === 429)
      expect(rateLimited).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long token strings', async () => {
      const longToken = 'a'.repeat(1000)
      const response = await verifyEmail(longToken)
      expect(response.status).toBe(400)
    })

    it('should handle special characters in token', async () => {
      const response = await verifyEmail('token!@#$%^&*()')
      expect(response.status).toBe(400)
    })

    it('should handle SQL injection attempts', async () => {
      const response = await verifyEmail("token'; DROP TABLE users; --")
      expect(response.status).toBe(400)
    })
  })
})
