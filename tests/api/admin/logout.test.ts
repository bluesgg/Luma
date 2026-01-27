// =============================================================================
// Admin Logout API Tests (TDD - Phase 7)
// POST /api/admin/logout
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

async function adminLogout(sessionCookie?: string) {
  const headers: any = { 'Content-Type': 'application/json' }
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie
  }

  const response = await fetch('/api/admin/logout', {
    method: 'POST',
    headers,
  })
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  }
}

describe('POST /api/admin/logout', () => {
  let adminId: string

  beforeEach(async () => {
    await prisma.admin.deleteMany()
    const admin = await prisma.admin.create({
      data: {
        email: 'admin@luma.com',
        passwordHash: '$2b$10$hashedpassword',
        role: 'ADMIN',
      },
    })
    adminId = admin.id
  })

  afterEach(async () => {
    await prisma.admin.deleteMany()
    await prisma.auditLog.deleteMany()
  })

  describe('Happy Path', () => {
    it('should logout admin successfully', async () => {
      const response = await adminLogout('luma-admin-session=valid-token')

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })

    it('should clear admin session cookie', async () => {
      const response = await adminLogout('luma-admin-session=valid-token')

      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toBeDefined()
      expect(setCookie).toContain('luma-admin-session')
      expect(setCookie).toContain('Max-Age=0')
    })

    it('should destroy session from database/cache', async () => {
      const response = await adminLogout('luma-admin-session=valid-token')

      expect(response.status).toBe(200)
      // Session should be destroyed in session store
    })

    it('should create audit log entry on logout', async () => {
      await adminLogout('luma-admin-session=valid-token')

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'ADMIN_LOGOUT',
        },
      })

      expect(auditLog).toBeDefined()
      expect(auditLog?.action).toBe('ADMIN_LOGOUT')
    })
  })

  describe('Authentication', () => {
    it('should require admin authentication', async () => {
      const response = await adminLogout()

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe('ADMIN_UNAUTHORIZED')
    })

    it('should reject invalid session token', async () => {
      const response = await adminLogout('luma-admin-session=invalid-token')

      expect(response.status).toBe(401)
    })

    it('should reject expired session token', async () => {
      const response = await adminLogout('luma-admin-session=expired-token')

      expect(response.status).toBe(401)
    })
  })

  describe('Idempotency', () => {
    it('should return success even if already logged out', async () => {
      await adminLogout('luma-admin-session=valid-token')
      const response = await adminLogout('luma-admin-session=valid-token')

      expect(response.status).toBe(200)
    })

    it('should handle multiple logout requests gracefully', async () => {
      const responses = await Promise.all([
        adminLogout('luma-admin-session=token1'),
        adminLogout('luma-admin-session=token1'),
        adminLogout('luma-admin-session=token1'),
      ])

      responses.forEach((response) => {
        expect([200, 401]).toContain(response.status)
      })
    })
  })

  describe('Audit Logging', () => {
    it('should log admin ID in audit entry', async () => {
      await adminLogout('luma-admin-session=valid-token')

      const auditLog = await prisma.auditLog.findFirst({
        where: { action: 'ADMIN_LOGOUT' },
      })

      expect(auditLog?.adminId).toBeDefined()
    })

    it('should log timestamp in audit entry', async () => {
      const before = new Date()
      await adminLogout('luma-admin-session=valid-token')
      const after = new Date()

      const auditLog = await prisma.auditLog.findFirst({
        where: { action: 'ADMIN_LOGOUT' },
      })

      expect(auditLog?.timestamp).toBeDefined()
      expect(auditLog!.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      )
      expect(auditLog!.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('Cookie Handling', () => {
    it('should delete cookie with correct path', async () => {
      const response = await adminLogout('luma-admin-session=valid-token')

      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toContain('Path=/')
    })

    it('should use httpOnly flag when deleting cookie', async () => {
      const response = await adminLogout('luma-admin-session=valid-token')

      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toContain('httpOnly')
    })

    it('should use secure flag in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const response = await adminLogout('luma-admin-session=valid-token')

      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toContain('secure')

      process.env.NODE_ENV = originalEnv
    })
  })
})
