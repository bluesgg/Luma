// =============================================================================
// User Login API Tests (TDD)
// POST /api/auth/login
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES, SECURITY } from '@/lib/constants'

async function loginUser(data: {
  email: string
  password: string
  rememberMe?: boolean
}) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  }
}

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany()
    // Create verified test user
    await prisma.user.create({
      data: {
        email: 'verified@example.com',
        passwordHash: '$2b$10$hashedpassword', // This will be properly hashed
        emailConfirmedAt: new Date(),
        role: 'STUDENT',
      },
    })
  })

  afterEach(async () => {
    await prisma.user.deleteMany()
  })

  describe('Happy Path', () => {
    it('should login with correct credentials', async () => {
      const response = await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword',
      })

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.user).toBeDefined()
      expect(response.data.data.user.email).toBe('verified@example.com')
    })

    it('should set httpOnly cookie with session', async () => {
      const response = await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword',
      })

      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toBeDefined()
      expect(setCookie).toContain('httpOnly')
      expect(setCookie).toContain('luma-session')
    })

    it('should set cookie expiry to 7 days by default', async () => {
      const response = await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword',
      })

      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toContain('max-age')
      // 7 days in seconds
      expect(setCookie).toContain(String(7 * 24 * 60 * 60))
    })

    it('should set cookie expiry to 30 days with rememberMe', async () => {
      const response = await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword',
        rememberMe: true,
      })

      const setCookie = response.headers.get('set-cookie')
      // 30 days in seconds
      expect(setCookie).toContain(String(30 * 24 * 60 * 60))
    })

    it('should update last_login_at timestamp', async () => {
      const beforeLogin = new Date()
      await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword',
      })
      const afterLogin = new Date()

      const user = await prisma.user.findUnique({
        where: { email: 'verified@example.com' },
      })

      expect(user?.lastLoginAt).toBeDefined()
      expect(user!.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(
        beforeLogin.getTime()
      )
      expect(user!.lastLoginAt!.getTime()).toBeLessThanOrEqual(
        afterLogin.getTime()
      )
    })

    it('should reset failed login attempts on success', async () => {
      // Set failed attempts
      await prisma.user.update({
        where: { email: 'verified@example.com' },
        data: { failedLoginAttempts: 3 },
      })

      await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword',
      })

      const user = await prisma.user.findUnique({
        where: { email: 'verified@example.com' },
      })

      expect(user?.failedLoginAttempts).toBe(0)
    })
  })

  describe('Email Verification Check', () => {
    it('should reject unverified email (403)', async () => {
      await prisma.user.create({
        data: {
          email: 'unverified@example.com',
          passwordHash: '$2b$10$hashedpassword',
          emailConfirmedAt: null, // Not verified
        },
      })

      const response = await loginUser({
        email: 'unverified@example.com',
        password: 'correctpassword',
      })

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED)
    })

    it('should provide helpful message for unverified email', async () => {
      await prisma.user.create({
        data: {
          email: 'unverified@example.com',
          passwordHash: '$2b$10$hashedpassword',
          emailConfirmedAt: null,
        },
      })

      const response = await loginUser({
        email: 'unverified@example.com',
        password: 'correctpassword',
      })

      expect(response.data.error.message).toContain('verify')
      expect(response.data.error.message).toContain('email')
    })
  })

  describe('Invalid Credentials', () => {
    it('should reject wrong password', async () => {
      const response = await loginUser({
        email: 'verified@example.com',
        password: 'wrongpassword',
      })

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS
      )
    })

    it('should reject non-existent email', async () => {
      const response = await loginUser({
        email: 'nonexistent@example.com',
        password: 'anypassword',
      })

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS
      )
    })

    it('should not reveal whether email exists', async () => {
      const response1 = await loginUser({
        email: 'verified@example.com',
        password: 'wrongpassword',
      })

      const response2 = await loginUser({
        email: 'nonexistent@example.com',
        password: 'anypassword',
      })

      // Both should return same error message
      expect(response1.data.error.message).toBe(response2.data.error.message)
    })
  })

  describe('Account Lockout', () => {
    it('should increment failed login attempts', async () => {
      await loginUser({
        email: 'verified@example.com',
        password: 'wrongpassword',
      })

      const user = await prisma.user.findUnique({
        where: { email: 'verified@example.com' },
      })

      expect(user?.failedLoginAttempts).toBe(1)
    })

    it('should lock account after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await loginUser({
          email: 'verified@example.com',
          password: 'wrongpassword',
        })
      }

      const user = await prisma.user.findUnique({
        where: { email: 'verified@example.com' },
      })

      expect(user?.lockedUntil).toBeDefined()
      expect(user!.lockedUntil!.getTime()).toBeGreaterThan(Date.now())
    })

    it('should lock account for 30 minutes', async () => {
      for (let i = 0; i < 5; i++) {
        await loginUser({
          email: 'verified@example.com',
          password: 'wrongpassword',
        })
      }

      const user = await prisma.user.findUnique({
        where: { email: 'verified@example.com' },
      })

      const lockDuration = user!.lockedUntil!.getTime() - Date.now()
      const thirtyMinutes = SECURITY.LOCKOUT_DURATION_MS
      const tolerance = 60 * 1000 // 1 minute tolerance

      expect(lockDuration).toBeGreaterThan(thirtyMinutes - tolerance)
      expect(lockDuration).toBeLessThan(thirtyMinutes + tolerance)
    })

    it('should reject login when account is locked', async () => {
      // Lock the account
      await prisma.user.update({
        where: { email: 'verified@example.com' },
        data: {
          lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
          failedLoginAttempts: 5,
        },
      })

      const response = await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword', // Even with correct password
      })

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_ACCOUNT_LOCKED)
    })

    it('should show remaining lockout time in error message', async () => {
      await prisma.user.update({
        where: { email: 'verified@example.com' },
        data: {
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          failedLoginAttempts: 5,
        },
      })

      const response = await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword',
      })

      expect(response.data.error.message).toMatch(/\d+.*minute/i)
    })

    it('should allow login after lockout expires', async () => {
      // Set lockout in the past
      await prisma.user.update({
        where: { email: 'verified@example.com' },
        data: {
          lockedUntil: new Date(Date.now() - 1000), // 1 second ago
          failedLoginAttempts: 5,
        },
      })

      const response = await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword',
      })

      expect(response.status).toBe(200)
    })
  })

  describe('Validation', () => {
    it('should reject invalid email format', async () => {
      const response = await loginUser({
        email: 'invalid-email',
        password: 'password123',
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject empty email', async () => {
      const response = await loginUser({
        email: '',
        password: 'password123',
      })

      expect(response.status).toBe(400)
    })

    it('should reject empty password', async () => {
      const response = await loginUser({
        email: 'verified@example.com',
        password: '',
      })

      expect(response.status).toBe(400)
    })

    it('should reject missing email', async () => {
      const response = await loginUser({
        password: 'password123',
      } as any)

      expect(response.status).toBe(400)
    })

    it('should reject missing password', async () => {
      const response = await loginUser({
        email: 'verified@example.com',
      } as any)

      expect(response.status).toBe(400)
    })
  })

  describe('Security', () => {
    it('should not return password hash', async () => {
      const response = await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword',
      })

      expect(response.data.data.user.passwordHash).toBeUndefined()
      expect(response.data.data.user.password).toBeUndefined()
    })

    it('should use secure cookie flags', async () => {
      const response = await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword',
      })

      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toContain('httpOnly')
      expect(setCookie).toContain('secure') // In production
      expect(setCookie).toContain('SameSite=')
    })

    it('should handle timing attacks by using consistent response time', async () => {
      const start1 = Date.now()
      await loginUser({
        email: 'nonexistent@example.com',
        password: 'password123',
      })
      const time1 = Date.now() - start1

      const start2 = Date.now()
      await loginUser({
        email: 'verified@example.com',
        password: 'wrongpassword',
      })
      const time2 = Date.now() - start2

      // Times should be similar (within reasonable tolerance)
      expect(Math.abs(time1 - time2)).toBeLessThan(500)
    })

    it('should rate limit login attempts', async () => {
      const requests = []
      for (let i = 0; i < 15; i++) {
        requests.push(
          loginUser({
            email: 'verified@example.com',
            password: 'wrongpassword',
          })
        )
      }

      const responses = await Promise.all(requests)
      const rateLimited = responses.some((r) => r.status === 429)
      expect(rateLimited).toBe(true)
    })
  })

  describe('Session Management', () => {
    it('should create session in database/cache', async () => {
      const response = await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword',
      })

      expect(response.status).toBe(200)
      // Session would be verified through Supabase or session store
    })

    it('should return user data in response', async () => {
      const response = await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword',
      })

      expect(response.data.data.user).toBeDefined()
      expect(response.data.data.user.id).toBeDefined()
      expect(response.data.data.user.email).toBe('verified@example.com')
      expect(response.data.data.user.role).toBe('STUDENT')
      expect(response.data.data.user.emailConfirmedAt).toBeDefined()
    })

    it('should not return sensitive fields', async () => {
      const response = await loginUser({
        email: 'verified@example.com',
        password: 'correctpassword',
      })

      const user = response.data.data.user
      expect(user.passwordHash).toBeUndefined()
      expect(user.failedLoginAttempts).toBeUndefined()
      expect(user.lockedUntil).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle case-insensitive email login', async () => {
      const response = await loginUser({
        email: 'VERIFIED@EXAMPLE.COM',
        password: 'correctpassword',
      })

      expect(response.status).toBe(200)
    })

    it('should trim whitespace from email', async () => {
      const response = await loginUser({
        email: '  verified@example.com  ',
        password: 'correctpassword',
      })

      expect(response.status).toBe(200)
    })

    it('should handle null values gracefully', async () => {
      const response = await loginUser({
        email: null as any,
        password: 'password123',
      })

      expect(response.status).toBe(400)
    })

    it('should handle concurrent login attempts', async () => {
      const responses = await Promise.all([
        loginUser({
          email: 'verified@example.com',
          password: 'correctpassword',
        }),
        loginUser({
          email: 'verified@example.com',
          password: 'correctpassword',
        }),
        loginUser({
          email: 'verified@example.com',
          password: 'correctpassword',
        }),
      ])

      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })
    })
  })
})
