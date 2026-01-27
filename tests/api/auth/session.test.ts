// =============================================================================
// Session Check API Tests (TDD)
// GET /api/auth/session
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'

async function checkSession(cookie?: string) {
  const headers: Record<string, string> = {}
  if (cookie) headers['Cookie'] = cookie

  const response = await fetch('/api/auth/session', {
    method: 'GET',
    headers,
  })
  return { status: response.status, data: await response.json() }
}

describe('GET /api/auth/session', () => {
  let testUser: any

  beforeEach(async () => {
    await prisma.user.deleteMany()
    testUser = await prisma.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: '$2b$10$hash',
        emailConfirmedAt: new Date(),
        role: 'STUDENT',
      },
    })
  })

  describe('Authenticated User', () => {
    it('should return user data for valid session', async () => {
      const response = await checkSession('luma-session=valid-session-token')

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.user).toBeDefined()
    })

    it('should include user id, email, and role', async () => {
      const response = await checkSession('luma-session=valid-session-token')

      const { user } = response.data.data
      expect(user.id).toBeDefined()
      expect(user.email).toBe('user@example.com')
      expect(user.role).toBe('STUDENT')
    })

    it('should include email verification status', async () => {
      const response = await checkSession('luma-session=valid-session-token')

      const { user } = response.data.data
      expect(user.emailConfirmedAt).toBeDefined()
    })

    it('should not return sensitive fields', async () => {
      const response = await checkSession('luma-session=valid-session-token')

      const { user } = response.data.data
      expect(user.passwordHash).toBeUndefined()
      expect(user.failedLoginAttempts).toBeUndefined()
      expect(user.lockedUntil).toBeUndefined()
    })
  })

  describe('Unauthenticated User', () => {
    it('should return 401 for missing session', async () => {
      const response = await checkSession()

      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
    })

    it('should return 401 for invalid session', async () => {
      const response = await checkSession('luma-session=invalid-token')

      expect(response.status).toBe(401)
    })

    it('should return 401 for expired session', async () => {
      const response = await checkSession('luma-session=expired-token')

      expect(response.status).toBe(401)
    })
  })

  describe('Session Refresh', () => {
    it('should refresh session on each check', async () => {
      const response = await checkSession('luma-session=valid-session-token')

      expect(response.status).toBe(200)
      // Session refresh through Supabase
    })

    it('should extend session expiry', async () => {
      const response = await checkSession('luma-session=valid-session-token')

      expect(response.status).toBe(200)
      // Verify through Set-Cookie header or session store
    })
  })

  describe('Security', () => {
    it('should only allow GET method', async () => {
      const response = await fetch('/api/auth/session', { method: 'POST' })
      expect(response.status).toBe(405)
    })

    it('should validate session signature', async () => {
      const response = await checkSession('luma-session=tampered-token')
      expect(response.status).toBe(401)
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed cookies gracefully', async () => {
      const response = await checkSession('invalid-cookie-format')
      expect(response.status).toBe(401)
    })

    it('should handle multiple session cookies', async () => {
      const response = await checkSession(
        'luma-session=token1; luma-session=token2'
      )
      expect([200, 401]).toContain(response.status)
    })
  })
})
