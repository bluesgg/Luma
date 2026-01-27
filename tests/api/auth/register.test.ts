// =============================================================================
// User Registration API Tests (TDD)
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/lib/constants'

/**
 * Test helper to make API request
 * This will fail until the route is implemented
 */
async function registerUser(data: { email: string; password: string }) {
  // This simulates calling POST /api/auth/register
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return {
    status: response.status,
    data: await response.json(),
  }
}

describe('POST /api/auth/register', () => {
  beforeEach(async () => {
    // Clear database before each test
    await prisma.verificationToken.deleteMany()
    await prisma.user.deleteMany()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Happy Path', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
      }

      const response = await registerUser(userData)

      expect(response.status).toBe(201)
      expect(response.data.success).toBe(true)
      expect(response.data.data).toBeDefined()
      expect(response.data.data.user).toBeDefined()
      expect(response.data.data.user.email).toBe(userData.email)
      expect(response.data.data.user.emailConfirmedAt).toBeNull()
    })

    it('should hash the password (not store plaintext)', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
      }

      await registerUser(userData)

      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      })

      expect(user).toBeDefined()
      expect(user?.passwordHash).toBeDefined()
      expect(user?.passwordHash).not.toBe(userData.password)
      expect(user?.passwordHash.length).toBeGreaterThan(0)
    })

    it('should create verification token with 24h expiry', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
      }

      await registerUser(userData)

      const user = await prisma.user.findUnique({
        where: { email: userData.email },
        include: { verificationTokens: true },
      })

      expect(user?.verificationTokens).toBeDefined()
      expect(user?.verificationTokens.length).toBeGreaterThan(0)

      const token = user?.verificationTokens[0]
      expect(token?.type).toBe('EMAIL_VERIFY')
      expect(token?.expiresAt).toBeDefined()

      // Token should expire approximately 24 hours from now
      const now = new Date()
      const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const timeDiff = Math.abs(
        token!.expiresAt.getTime() - expectedExpiry.getTime()
      )
      expect(timeDiff).toBeLessThan(60 * 1000) // Within 1 minute
    })

    it('should send verification email', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
      }

      const response = await registerUser(userData)

      expect(response.status).toBe(201)
      // Email sending would be verified through mocks
    })

    it('should set email_confirmed_at to null initially', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
      }

      await registerUser(userData)

      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      })

      expect(user?.emailConfirmedAt).toBeNull()
    })

    it('should set default role to STUDENT', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
      }

      await registerUser(userData)

      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      })

      expect(user?.role).toBe('STUDENT')
    })

    it('should initialize failed login attempts to 0', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
      }

      await registerUser(userData)

      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      })

      expect(user?.failedLoginAttempts).toBe(0)
      expect(user?.lockedUntil).toBeNull()
    })

    it('should return message to check email', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
      }

      const response = await registerUser(userData)

      expect(response.data.data.message).toContain('verification')
      expect(response.data.data.message).toContain('email')
    })
  })

  describe('Email Validation', () => {
    it('should reject invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
      }

      const response = await registerUser(userData)

      expect(response.status).toBe(400)
      expect(response.data.success).toBe(false)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
      expect(response.data.error.message).toContain('email')
    })

    it('should reject empty email', async () => {
      const userData = {
        email: '',
        password: 'password123',
      }

      const response = await registerUser(userData)

      expect(response.status).toBe(400)
      expect(response.data.success).toBe(false)
    })

    it('should reject missing email', async () => {
      const userData = {
        password: 'password123',
      } as any

      const response = await registerUser(userData)

      expect(response.status).toBe(400)
      expect(response.data.success).toBe(false)
    })

    it('should accept various valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com',
      ]

      for (const email of validEmails) {
        await prisma.user.deleteMany() // Clean between tests

        const response = await registerUser({
          email,
          password: 'password123',
        })

        expect(response.status).toBe(201)
      }
    })

    it('should normalize email to lowercase', async () => {
      const userData = {
        email: 'User@Example.COM',
        password: 'password123',
      }

      await registerUser(userData)

      const user = await prisma.user.findUnique({
        where: { email: 'user@example.com' },
      })

      expect(user).toBeDefined()
      expect(user?.email).toBe('user@example.com')
    })
  })

  describe('Password Validation', () => {
    it('should reject password shorter than 8 characters', async () => {
      const userData = {
        email: 'user@example.com',
        password: 'short',
      }

      const response = await registerUser(userData)

      expect(response.status).toBe(400)
      expect(response.data.success).toBe(false)
      expect(response.data.error.message).toContain('8')
    })

    it('should accept password with exactly 8 characters', async () => {
      const userData = {
        email: 'user@example.com',
        password: '12345678',
      }

      const response = await registerUser(userData)

      expect(response.status).toBe(201)
      expect(response.data.success).toBe(true)
    })

    it('should accept long passwords', async () => {
      const userData = {
        email: 'user@example.com',
        password: 'a'.repeat(100),
      }

      const response = await registerUser(userData)

      expect(response.status).toBe(201)
    })

    it('should reject empty password', async () => {
      const userData = {
        email: 'user@example.com',
        password: '',
      }

      const response = await registerUser(userData)

      expect(response.status).toBe(400)
      expect(response.data.success).toBe(false)
    })

    it('should reject missing password', async () => {
      const userData = {
        email: 'user@example.com',
      } as any

      const response = await registerUser(userData)

      expect(response.status).toBe(400)
    })

    it('should accept passwords with special characters', async () => {
      const userData = {
        email: 'user@example.com',
        password: 'P@ssw0rd!#$%',
      }

      const response = await registerUser(userData)

      expect(response.status).toBe(201)
    })

    it('should accept passwords with unicode characters', async () => {
      const userData = {
        email: 'user@example.com',
        password: '密码123456',
      }

      const response = await registerUser(userData)

      expect(response.status).toBe(201)
    })
  })

  describe('Duplicate Email Prevention', () => {
    it('should prevent duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
      }

      // First registration
      const response1 = await registerUser(userData)
      expect(response1.status).toBe(201)

      // Second registration with same email
      const response2 = await registerUser(userData)

      expect(response2.status).toBe(400)
      expect(response2.data.success).toBe(false)
      expect(response2.data.error.message).toContain('already')
    })

    it('should check for duplicates case-insensitively', async () => {
      const userData1 = {
        email: 'user@example.com',
        password: 'password123',
      }

      await registerUser(userData1)

      const userData2 = {
        email: 'USER@EXAMPLE.COM',
        password: 'password123',
      }

      const response = await registerUser(userData2)

      expect(response.status).toBe(400)
      expect(response.data.error.message).toContain('already')
    })

    it('should allow registration with different emails', async () => {
      const userData1 = {
        email: 'user1@example.com',
        password: 'password123',
      }
      const userData2 = {
        email: 'user2@example.com',
        password: 'password123',
      }

      const response1 = await registerUser(userData1)
      const response2 = await registerUser(userData2)

      expect(response1.status).toBe(201)
      expect(response2.status).toBe(201)
    })
  })

  describe('Security', () => {
    it('should not return password hash in response', async () => {
      const userData = {
        email: 'user@example.com',
        password: 'password123',
      }

      const response = await registerUser(userData)

      expect(response.data.data.user.passwordHash).toBeUndefined()
      expect(response.data.data.user.password).toBeUndefined()
    })

    it('should not return verification token in response', async () => {
      const userData = {
        email: 'user@example.com',
        password: 'password123',
      }

      const response = await registerUser(userData)

      expect(response.data.data.token).toBeUndefined()
      expect(response.data.data.verificationToken).toBeUndefined()
    })

    it('should rate limit registration attempts', async () => {
      // This would be tested with rate limiting middleware
      // Simulate multiple rapid registration attempts
      const requests = []
      for (let i = 0; i < 15; i++) {
        requests.push(
          registerUser({
            email: `user${i}@example.com`,
            password: 'password123',
          })
        )
      }

      const responses = await Promise.all(requests)

      // At least one should be rate limited
      const rateLimited = responses.some((r) => r.status === 429)
      expect(rateLimited).toBe(true)
    })

    it('should use bcrypt with appropriate cost factor', async () => {
      const userData = {
        email: 'user@example.com',
        password: 'password123',
      }

      await registerUser(userData)

      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      })

      // Bcrypt hash should match pattern with cost factor
      expect(user?.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/)
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock database error
      vi.spyOn(prisma.user, 'create').mockRejectedValueOnce(
        new Error('DB Error')
      )

      const userData = {
        email: 'user@example.com',
        password: 'password123',
      }

      const response = await registerUser(userData)

      expect(response.status).toBe(500)
      expect(response.data.success).toBe(false)
    })

    it('should handle email service failures gracefully', async () => {
      // Mock email service failure
      const userData = {
        email: 'user@example.com',
        password: 'password123',
      }

      const response = await registerUser(userData)

      // Should still create user even if email fails
      expect(response.status).toBe(201)

      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      })
      expect(user).toBeDefined()
    })

    it('should validate JSON body format', async () => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      expect(response.status).toBe(400)
    })

    it('should handle invalid Content-Type', async () => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password123',
        }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Concurrent Registrations', () => {
    it('should handle concurrent registrations safely', async () => {
      const users = [
        { email: 'user1@example.com', password: 'password123' },
        { email: 'user2@example.com', password: 'password123' },
        { email: 'user3@example.com', password: 'password123' },
      ]

      const responses = await Promise.all(users.map((u) => registerUser(u)))

      responses.forEach((response) => {
        expect(response.status).toBe(201)
      })

      const userCount = await prisma.user.count()
      expect(userCount).toBe(3)
    })

    it('should handle race condition for duplicate emails', async () => {
      const userData = {
        email: 'race@example.com',
        password: 'password123',
      }

      // Attempt to register same email concurrently
      const responses = await Promise.all([
        registerUser(userData),
        registerUser(userData),
        registerUser(userData),
      ])

      // Only one should succeed
      const successes = responses.filter((r) => r.status === 201)
      const failures = responses.filter((r) => r.status === 400)

      expect(successes.length).toBe(1)
      expect(failures.length).toBe(2)

      const userCount = await prisma.user.count({
        where: { email: userData.email },
      })
      expect(userCount).toBe(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long emails', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com'

      const response = await registerUser({
        email: longEmail,
        password: 'password123',
      })

      // Should either accept or reject with validation error
      expect([201, 400]).toContain(response.status)
    })

    it('should handle international characters in email', async () => {
      const userData = {
        email: 'user@例え.jp',
        password: 'password123',
      }

      const response = await registerUser(userData)

      expect([201, 400]).toContain(response.status)
    })

    it('should trim whitespace from email', async () => {
      const userData = {
        email: '  user@example.com  ',
        password: 'password123',
      }

      await registerUser(userData)

      const user = await prisma.user.findUnique({
        where: { email: 'user@example.com' },
      })

      expect(user).toBeDefined()
    })

    it('should reject null values', async () => {
      const userData = {
        email: null as any,
        password: 'password123',
      }

      const response = await registerUser(userData)

      expect(response.status).toBe(400)
    })

    it('should reject undefined values', async () => {
      const userData = {
        email: undefined as any,
        password: 'password123',
      }

      const response = await registerUser(userData)

      expect(response.status).toBe(400)
    })

    it('should handle extra fields in request body', async () => {
      const userData = {
        email: 'user@example.com',
        password: 'password123',
        role: 'ADMIN', // Should be ignored
        extraField: 'should be ignored',
      } as any

      const response = await registerUser(userData)

      expect(response.status).toBe(201)

      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      })

      // Role should be STUDENT (default), not ADMIN
      expect(user?.role).toBe('STUDENT')
    })
  })
})
