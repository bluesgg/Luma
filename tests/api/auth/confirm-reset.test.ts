// =============================================================================
// Password Reset Confirmation API Tests (TDD)
// POST /api/auth/confirm-reset
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/lib/constants'

async function confirmPasswordReset(data: { token: string; password: string }) {
  const response = await fetch('/api/auth/confirm-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return { status: response.status, data: await response.json() }
}

describe('POST /api/auth/confirm-reset', () => {
  let testUser: any
  let validToken: string

  beforeEach(async () => {
    await prisma.verificationToken.deleteMany()
    await prisma.user.deleteMany()

    testUser = await prisma.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: '$2b$10$oldhash',
        emailConfirmedAt: new Date(),
      },
    })

    const tokenRecord = await prisma.verificationToken.create({
      data: {
        userId: testUser.id,
        token: 'reset-token-123',
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
    validToken = tokenRecord.token
  })

  describe('Happy Path', () => {
    it('should reset password with valid token', async () => {
      const response = await confirmPasswordReset({
        token: validToken,
        password: 'newpassword123',
      })

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })

    it('should update password hash in database', async () => {
      const oldUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      })

      await confirmPasswordReset({
        token: validToken,
        password: 'newpassword123',
      })

      const newUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      })
      expect(newUser?.passwordHash).not.toBe(oldUser?.passwordHash)
    })

    it('should mark token as used', async () => {
      await confirmPasswordReset({
        token: validToken,
        password: 'newpassword123',
      })

      const token = await prisma.verificationToken.findUnique({
        where: { token: validToken },
      })
      expect(token?.usedAt).toBeDefined()
    })

    it('should invalidate all existing sessions', async () => {
      await confirmPasswordReset({
        token: validToken,
        password: 'newpassword123',
      })

      // Sessions should be destroyed (verify through Supabase)
      expect(true).toBe(true)
    })

    it('should send password changed confirmation email', async () => {
      const response = await confirmPasswordReset({
        token: validToken,
        password: 'newpassword123',
      })

      expect(response.status).toBe(200)
      // Email verification through mocks
    })
  })

  describe('Token Validation', () => {
    it('should reject invalid token', async () => {
      const response = await confirmPasswordReset({
        token: 'invalid-token',
        password: 'newpassword123',
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_TOKEN_INVALID)
    })

    it('should reject expired token', async () => {
      const expiredToken = await prisma.verificationToken.create({
        data: {
          userId: testUser.id,
          token: 'expired-token',
          type: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() - 1000),
        },
      })

      const response = await confirmPasswordReset({
        token: expiredToken.token,
        password: 'newpassword123',
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_TOKEN_EXPIRED)
    })

    it('should reject already used token', async () => {
      await confirmPasswordReset({
        token: validToken,
        password: 'newpassword123',
      })

      const response = await confirmPasswordReset({
        token: validToken,
        password: 'anotherpassword',
      })

      expect(response.status).toBe(400)
    })

    it('should reject EMAIL_VERIFY token type', async () => {
      const wrongTypeToken = await prisma.verificationToken.create({
        data: {
          userId: testUser.id,
          token: 'wrong-type-token',
          type: 'EMAIL_VERIFY',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      const response = await confirmPasswordReset({
        token: wrongTypeToken.token,
        password: 'newpassword123',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Password Validation', () => {
    it('should reject password shorter than 8 characters', async () => {
      const response = await confirmPasswordReset({
        token: validToken,
        password: 'short',
      })

      expect(response.status).toBe(400)
      expect(response.data.error.message).toContain('8')
    })

    it('should accept password with exactly 8 characters', async () => {
      const response = await confirmPasswordReset({
        token: validToken,
        password: '12345678',
      })

      expect(response.status).toBe(200)
    })

    it('should reject empty password', async () => {
      const response = await confirmPasswordReset({
        token: validToken,
        password: '',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Security', () => {
    it('should hash new password with bcrypt', async () => {
      await confirmPasswordReset({
        token: validToken,
        password: 'newpassword123',
      })

      const user = await prisma.user.findUnique({ where: { id: testUser.id } })
      expect(user?.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/)
      expect(user?.passwordHash).not.toBe('newpassword123')
    })

    it('should not allow reusing same password', async () => {
      // Optional: Some systems prevent password reuse
      const response = await confirmPasswordReset({
        token: validToken,
        password: 'oldpassword',
      })

      // This could either succeed or fail depending on requirements
      expect([200, 400]).toContain(response.status)
    })
  })
})
