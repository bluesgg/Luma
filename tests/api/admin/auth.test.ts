// =============================================================================
// Admin Auth Check API Tests (TDD - Phase 7)
// GET /api/admin/auth
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

async function checkAdminAuth(sessionCookie?: string) {
  const headers: any = {}
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie
  }

  const response = await fetch('/api/admin/auth', {
    method: 'GET',
    headers,
  })
  return {
    status: response.status,
    data: await response.json(),
  }
}

describe('GET /api/admin/auth', () => {
  beforeEach(async () => {
    await prisma.admin.deleteMany()
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
  })

  describe('Happy Path', () => {
    it('should return admin info when authenticated', async () => {
      const response = await checkAdminAuth('luma-admin-session=valid-token')

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.admin).toBeDefined()
      expect(response.data.data.admin.email).toBe('admin@luma.com')
    })

    it('should return admin role in response', async () => {
      const response = await checkAdminAuth('luma-admin-session=valid-token')

      expect(response.data.data.admin.role).toBe('ADMIN')
    })

    it('should return super admin info', async () => {
      await prisma.admin.create({
        data: {
          email: 'super@luma.com',
          passwordHash: '$2b$10$hashedpassword',
          role: 'SUPER_ADMIN',
        },
      })

      const response = await checkAdminAuth('luma-admin-session=super-token')

      expect(response.status).toBe(200)
      expect(response.data.data.admin.role).toBe('SUPER_ADMIN')
    })
  })

  describe('Unauthenticated Access', () => {
    it('should return 401 when no session cookie', async () => {
      const response = await checkAdminAuth()

      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe('ADMIN_UNAUTHORIZED')
    })

    it('should return 401 for invalid session token', async () => {
      const response = await checkAdminAuth('luma-admin-session=invalid-token')

      expect(response.status).toBe(401)
    })

    it('should return 401 for expired session', async () => {
      const response = await checkAdminAuth('luma-admin-session=expired-token')

      expect(response.status).toBe(401)
    })
  })

  describe('Disabled Admin', () => {
    it('should return 403 for disabled admin account', async () => {
      await prisma.admin.update({
        where: { email: 'admin@luma.com' },
        data: { disabledAt: new Date() },
      })

      const response = await checkAdminAuth('luma-admin-session=valid-token')

      expect(response.status).toBe(403)
      expect(response.data.error.code).toBe('ADMIN_DISABLED')
    })
  })

  describe('Security', () => {
    it('should not return password hash', async () => {
      const response = await checkAdminAuth('luma-admin-session=valid-token')

      expect(response.data.data.admin.passwordHash).toBeUndefined()
      expect(response.data.data.admin.password).toBeUndefined()
    })

    it('should not return sensitive fields', async () => {
      const response = await checkAdminAuth('luma-admin-session=valid-token')

      const admin = response.data.data.admin
      expect(admin.disabledAt).toBeUndefined()
    })

    it('should reject regular user session cookie', async () => {
      const response = await checkAdminAuth('luma-session=user-token')

      expect(response.status).toBe(401)
    })
  })

  describe('Response Format', () => {
    it('should include admin ID in response', async () => {
      const response = await checkAdminAuth('luma-admin-session=valid-token')

      expect(response.data.data.admin.id).toBeDefined()
      expect(typeof response.data.data.admin.id).toBe('string')
    })

    it('should include createdAt in response', async () => {
      const response = await checkAdminAuth('luma-admin-session=valid-token')

      expect(response.data.data.admin.createdAt).toBeDefined()
    })

    it('should have consistent response structure', async () => {
      const response = await checkAdminAuth('luma-admin-session=valid-token')

      expect(response.data).toHaveProperty('success')
      expect(response.data).toHaveProperty('data')
      expect(response.data.data).toHaveProperty('admin')
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed cookie', async () => {
      const response = await checkAdminAuth('invalid-cookie-format')

      expect(response.status).toBe(401)
    })

    it('should handle empty cookie value', async () => {
      const response = await checkAdminAuth('luma-admin-session=')

      expect(response.status).toBe(401)
    })
  })
})
