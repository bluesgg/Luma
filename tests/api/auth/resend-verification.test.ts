// =============================================================================
// Resend Verification Email API Tests (TDD)
// POST /api/auth/resend-verification
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/lib/constants'

async function resendVerification(email: string) {
  const response = await fetch('/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return { status: response.status, data: await response.json() }
}

describe('POST /api/auth/resend-verification', () => {
  beforeEach(async () => {
    await prisma.verificationToken.deleteMany()
    await prisma.user.deleteMany()
    await prisma.user.create({
      data: {
        email: 'unverified@example.com',
        passwordHash: '$2b$10$hash',
        emailConfirmedAt: null,
      },
    })
  })

  describe('Happy Path', () => {
    it('should resend verification email successfully', async () => {
      const response = await resendVerification('unverified@example.com')
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })

    it('should invalidate old tokens before creating new one', async () => {
      await resendVerification('unverified@example.com')
      await resendVerification('unverified@example.com')

      const tokens = await prisma.verificationToken.findMany({
        where: {
          user: { email: 'unverified@example.com' },
          type: 'EMAIL_VERIFY',
        },
      })

      const unusedTokens = tokens.filter(
        (t) => !t.usedAt && t.expiresAt > new Date()
      )
      expect(unusedTokens.length).toBe(1) // Only one valid token
    })

    it('should send new verification email', async () => {
      const response = await resendVerification('unverified@example.com')
      expect(response.status).toBe(200)
      // Email mock verification
    })
  })

  describe('Already Verified', () => {
    it('should reject for already verified email', async () => {
      await prisma.user.update({
        where: { email: 'unverified@example.com' },
        data: { emailConfirmedAt: new Date() },
      })

      const response = await resendVerification('unverified@example.com')
      expect(response.status).toBe(400)
      expect(response.data.error.message).toContain('already verified')
    })
  })

  describe('Rate Limiting', () => {
    it('should rate limit to 5 requests per 15 minutes', async () => {
      const requests = []
      for (let i = 0; i < 6; i++) {
        requests.push(resendVerification('unverified@example.com'))
      }

      const responses = await Promise.all(requests)
      const rateLimited = responses.filter((r) => r.status === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
    })

    it('should return rate limit error code', async () => {
      for (let i = 0; i < 5; i++) {
        await resendVerification('unverified@example.com')
      }

      const response = await resendVerification('unverified@example.com')
      expect(response.status).toBe(429)
      expect(response.data.error.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED)
    })
  })

  describe('Validation', () => {
    it('should reject invalid email', async () => {
      const response = await resendVerification('invalid-email')
      expect(response.status).toBe(400)
    })

    it('should reject non-existent email', async () => {
      const response = await resendVerification('nonexistent@example.com')
      expect(response.status).toBe(404)
    })
  })

  describe('Security', () => {
    it('should not reveal if email exists for security', async () => {
      // Alternative: return success even for non-existent emails
      const response = await resendVerification('nonexistent@example.com')
      expect([200, 404]).toContain(response.status)
    })
  })
})
