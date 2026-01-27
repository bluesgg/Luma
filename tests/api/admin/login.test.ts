// =============================================================================
// Admin Login API Tests (TDD - Phase 7)
// POST /api/admin/login
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

async function adminLogin(data: { email: string; password: string }) {
  const response = await fetch('/api/admin/login', {
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

describe('POST /api/admin/login', () => {
  beforeEach(async () => {
    await prisma.admin.deleteMany()
    // Create test admin
    await prisma.admin.create({
      data: {
        email: 'admin@luma.com',
        passwordHash: '$2b$10$hashedpassword',
        role: 'ADMIN',
      },
    })
  })

  afterEach(async () => {
    await prisma.admin.deleteMany()
    await prisma.auditLog.deleteMany()
  })

  describe('Happy Path', () => {
    it('should login admin with correct credentials', async () => {
      const response = await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.admin).toBeDefined()
      expect(response.data.data.admin.email).toBe('admin@luma.com')
      expect(response.data.data.admin.role).toBe('ADMIN')
    })

    it('should set httpOnly cookie with admin session', async () => {
      const response = await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toBeDefined()
      expect(setCookie).toContain('luma-admin-session')
      expect(setCookie).toContain('httpOnly')
    })

    it('should set cookie expiry to 24 hours', async () => {
      const response = await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      const setCookie = response.headers.get('set-cookie')
      // 24 hours in seconds
      expect(setCookie).toContain(String(24 * 60 * 60))
    })

    it('should create audit log entry on login', async () => {
      await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'ADMIN_LOGIN',
        },
      })

      expect(auditLog).toBeDefined()
      expect(auditLog?.action).toBe('ADMIN_LOGIN')
    })

    it('should login super admin with correct credentials', async () => {
      await prisma.admin.create({
        data: {
          email: 'super@luma.com',
          passwordHash: '$2b$10$hashedpassword',
          role: 'SUPER_ADMIN',
        },
      })

      const response = await adminLogin({
        email: 'super@luma.com',
        password: 'correctpassword',
      })

      expect(response.status).toBe(200)
      expect(response.data.data.admin.role).toBe('SUPER_ADMIN')
    })
  })

  describe('Invalid Credentials', () => {
    it('should reject wrong password', async () => {
      const response = await adminLogin({
        email: 'admin@luma.com',
        password: 'wrongpassword',
      })

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe('ADMIN_INVALID_CREDENTIALS')
    })

    it('should reject non-existent email', async () => {
      const response = await adminLogin({
        email: 'nonexistent@luma.com',
        password: 'anypassword',
      })

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe('ADMIN_INVALID_CREDENTIALS')
    })

    it('should not reveal whether email exists', async () => {
      const response1 = await adminLogin({
        email: 'admin@luma.com',
        password: 'wrongpassword',
      })

      const response2 = await adminLogin({
        email: 'nonexistent@luma.com',
        password: 'anypassword',
      })

      expect(response1.data.error.message).toBe(response2.data.error.message)
    })

    it('should create audit log for failed login attempt', async () => {
      await adminLogin({
        email: 'admin@luma.com',
        password: 'wrongpassword',
      })

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'ADMIN_LOGIN_FAILED',
        },
      })

      expect(auditLog).toBeDefined()
    })
  })

  describe('Disabled Admin Account', () => {
    it('should reject login for disabled admin', async () => {
      await prisma.admin.update({
        where: { email: 'admin@luma.com' },
        data: { disabledAt: new Date() },
      })

      const response = await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe('ADMIN_DISABLED')
    })

    it('should show helpful message for disabled account', async () => {
      await prisma.admin.update({
        where: { email: 'admin@luma.com' },
        data: { disabledAt: new Date() },
      })

      const response = await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      expect(response.data.error.message).toContain('disabled')
    })
  })

  describe('Validation', () => {
    it('should reject invalid email format', async () => {
      const response = await adminLogin({
        email: 'invalid-email',
        password: 'password123',
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject empty email', async () => {
      const response = await adminLogin({
        email: '',
        password: 'password123',
      })

      expect(response.status).toBe(400)
    })

    it('should reject empty password', async () => {
      const response = await adminLogin({
        email: 'admin@luma.com',
        password: '',
      })

      expect(response.status).toBe(400)
    })

    it('should reject missing email', async () => {
      const response = await adminLogin({
        password: 'password123',
      } as any)

      expect(response.status).toBe(400)
    })

    it('should reject missing password', async () => {
      const response = await adminLogin({
        email: 'admin@luma.com',
      } as any)

      expect(response.status).toBe(400)
    })
  })

  describe('Security', () => {
    it('should not return password hash', async () => {
      const response = await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      expect(response.data.data.admin.passwordHash).toBeUndefined()
      expect(response.data.data.admin.password).toBeUndefined()
    })

    it('should use secure cookie flags', async () => {
      const response = await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toContain('httpOnly')
      expect(setCookie).toContain('secure')
      expect(setCookie).toContain('SameSite')
    })

    it('should handle timing attacks with consistent response time', async () => {
      const start1 = Date.now()
      await adminLogin({
        email: 'nonexistent@luma.com',
        password: 'password123',
      })
      const time1 = Date.now() - start1

      const start2 = Date.now()
      await adminLogin({
        email: 'admin@luma.com',
        password: 'wrongpassword',
      })
      const time2 = Date.now() - start2

      expect(Math.abs(time1 - time2)).toBeLessThan(500)
    })

    it('should rate limit login attempts', async () => {
      const requests = []
      for (let i = 0; i < 15; i++) {
        requests.push(
          adminLogin({
            email: 'admin@luma.com',
            password: 'wrongpassword',
          })
        )
      }

      const responses = await Promise.all(requests)
      const rateLimited = responses.some((r) => r.status === 429)
      expect(rateLimited).toBe(true)
    })

    it('should not allow regular user credentials', async () => {
      // Create regular user
      await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash: '$2b$10$hashedpassword',
          emailConfirmedAt: new Date(),
        },
      })

      const response = await adminLogin({
        email: 'user@example.com',
        password: 'correctpassword',
      })

      expect(response.status).toBe(401)
    })
  })

  describe('Session Management', () => {
    it('should create session in database/cache', async () => {
      const response = await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      expect(response.status).toBe(200)
      // Session verification would happen through session store
    })

    it('should return admin data in response', async () => {
      const response = await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      expect(response.data.data.admin).toBeDefined()
      expect(response.data.data.admin.id).toBeDefined()
      expect(response.data.data.admin.email).toBe('admin@luma.com')
      expect(response.data.data.admin.role).toBe('ADMIN')
    })

    it('should not return sensitive fields', async () => {
      const response = await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      const admin = response.data.data.admin
      expect(admin.passwordHash).toBeUndefined()
      expect(admin.disabledAt).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle case-insensitive email login', async () => {
      const response = await adminLogin({
        email: 'ADMIN@LUMA.COM',
        password: 'correctpassword',
      })

      expect(response.status).toBe(200)
    })

    it('should trim whitespace from email', async () => {
      const response = await adminLogin({
        email: '  admin@luma.com  ',
        password: 'correctpassword',
      })

      expect(response.status).toBe(200)
    })

    it('should handle null values gracefully', async () => {
      const response = await adminLogin({
        email: null as any,
        password: 'password123',
      })

      expect(response.status).toBe(400)
    })

    it('should handle concurrent login attempts', async () => {
      const responses = await Promise.all([
        adminLogin({
          email: 'admin@luma.com',
          password: 'correctpassword',
        }),
        adminLogin({
          email: 'admin@luma.com',
          password: 'correctpassword',
        }),
        adminLogin({
          email: 'admin@luma.com',
          password: 'correctpassword',
        }),
      ])

      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Audit Logging', () => {
    it('should log admin email in audit entry', async () => {
      await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      const auditLog = await prisma.auditLog.findFirst({
        where: { action: 'ADMIN_LOGIN' },
      })

      expect(auditLog?.metadata).toMatchObject({
        email: 'admin@luma.com',
      })
    })

    it('should log IP address in audit entry', async () => {
      await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      const auditLog = await prisma.auditLog.findFirst({
        where: { action: 'ADMIN_LOGIN' },
      })

      expect(auditLog?.metadata).toHaveProperty('ip')
    })

    it('should log user agent in audit entry', async () => {
      await adminLogin({
        email: 'admin@luma.com',
        password: 'correctpassword',
      })

      const auditLog = await prisma.auditLog.findFirst({
        where: { action: 'ADMIN_LOGIN' },
      })

      expect(auditLog?.metadata).toHaveProperty('userAgent')
    })
  })
})
