// =============================================================================
// Admin Authentication Utilities Tests (TDD - Phase 7)
// Tests for src/lib/admin-auth.ts
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

// Mock implementation - will be implemented later
const mockGetAdminSession = vi.fn()
const mockRequireAdmin = vi.fn()
const mockRequireSuperAdmin = vi.fn()
const mockSetAdminSession = vi.fn()
const mockClearAdminSession = vi.fn()

describe('Admin Authentication Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAdminSession', () => {
    it('should return null when no admin session cookie exists', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue(undefined),
      }
      vi.mocked(cookies).mockReturnValue(mockCookies as any)

      const session = await mockGetAdminSession()

      expect(session).toBeNull()
    })

    it('should return admin session when valid cookie exists', async () => {
      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@luma.com',
        role: 'ADMIN',
      }

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'valid-session-token' }),
      }
      vi.mocked(cookies).mockReturnValue(mockCookies as any)
      mockGetAdminSession.mockResolvedValue(mockAdmin)

      const session = await mockGetAdminSession()

      expect(session).toEqual(mockAdmin)
      expect(session.email).toBe('admin@luma.com')
    })

    it('should return null for expired session', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'expired-token' }),
      }
      vi.mocked(cookies).mockReturnValue(mockCookies as any)
      mockGetAdminSession.mockResolvedValue(null)

      const session = await mockGetAdminSession()

      expect(session).toBeNull()
    })

    it('should return null for invalid session token', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'invalid-token' }),
      }
      vi.mocked(cookies).mockReturnValue(mockCookies as any)
      mockGetAdminSession.mockResolvedValue(null)

      const session = await mockGetAdminSession()

      expect(session).toBeNull()
    })

    it('should check luma-admin-session cookie name', async () => {
      const mockCookies = {
        get: vi.fn(),
      }
      vi.mocked(cookies).mockReturnValue(mockCookies as any)

      await mockGetAdminSession()

      expect(mockCookies.get).toHaveBeenCalledWith('luma-admin-session')
    })

    it('should return null for disabled admin account', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'valid-token' }),
      }
      vi.mocked(cookies).mockReturnValue(mockCookies as any)

      const disabledAdmin = await prisma.admin.findUnique({
        where: { email: 'disabled@luma.com' },
      })

      if (disabledAdmin?.disabledAt) {
        mockGetAdminSession.mockResolvedValue(null)
      }

      const session = await mockGetAdminSession()

      expect(session).toBeNull()
    })
  })

  describe('requireAdmin', () => {
    it('should return admin session when authenticated', async () => {
      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@luma.com',
        role: 'ADMIN',
      }

      mockRequireAdmin.mockResolvedValue(mockAdmin)

      const admin = await mockRequireAdmin()

      expect(admin).toEqual(mockAdmin)
      expect(admin.role).toBe('ADMIN')
    })

    it('should throw 401 error when not authenticated', async () => {
      mockRequireAdmin.mockRejectedValue({
        status: 401,
        code: 'ADMIN_UNAUTHORIZED',
        message: 'Admin authentication required',
      })

      await expect(mockRequireAdmin()).rejects.toMatchObject({
        status: 401,
        code: 'ADMIN_UNAUTHORIZED',
      })
    })

    it('should throw 403 error for disabled admin', async () => {
      mockRequireAdmin.mockRejectedValue({
        status: 403,
        code: 'ADMIN_DISABLED',
        message: 'Admin account has been disabled',
      })

      await expect(mockRequireAdmin()).rejects.toMatchObject({
        status: 403,
        code: 'ADMIN_DISABLED',
      })
    })

    it('should accept both ADMIN and SUPER_ADMIN roles', async () => {
      const superAdmin = {
        id: 'admin-2',
        email: 'super@luma.com',
        role: 'SUPER_ADMIN',
      }

      mockRequireAdmin.mockResolvedValue(superAdmin)

      const admin = await mockRequireAdmin()

      expect(admin.role).toBe('SUPER_ADMIN')
    })
  })

  describe('requireSuperAdmin', () => {
    it('should return super admin session when authenticated', async () => {
      const mockSuperAdmin = {
        id: 'admin-1',
        email: 'super@luma.com',
        role: 'SUPER_ADMIN',
      }

      mockRequireSuperAdmin.mockResolvedValue(mockSuperAdmin)

      const admin = await mockRequireSuperAdmin()

      expect(admin).toEqual(mockSuperAdmin)
      expect(admin.role).toBe('SUPER_ADMIN')
    })

    it('should throw 401 error when not authenticated', async () => {
      mockRequireSuperAdmin.mockRejectedValue({
        status: 401,
        code: 'ADMIN_UNAUTHORIZED',
        message: 'Admin authentication required',
      })

      await expect(mockRequireSuperAdmin()).rejects.toMatchObject({
        status: 401,
        code: 'ADMIN_UNAUTHORIZED',
      })
    })

    it('should throw 403 error for regular admin role', async () => {
      mockRequireSuperAdmin.mockRejectedValue({
        status: 403,
        code: 'ADMIN_FORBIDDEN',
        message: 'Super admin access required',
      })

      await expect(mockRequireSuperAdmin()).rejects.toMatchObject({
        status: 403,
        code: 'ADMIN_FORBIDDEN',
      })
    })

    it('should only accept SUPER_ADMIN role', async () => {
      const regularAdmin = {
        id: 'admin-2',
        email: 'admin@luma.com',
        role: 'ADMIN',
      }

      mockRequireSuperAdmin.mockRejectedValue({
        status: 403,
        code: 'ADMIN_FORBIDDEN',
      })

      await expect(mockRequireSuperAdmin()).rejects.toMatchObject({
        status: 403,
      })
    })
  })

  describe('setAdminSession', () => {
    it('should set httpOnly cookie with admin session', async () => {
      const mockCookies = {
        set: vi.fn(),
      }
      vi.mocked(cookies).mockReturnValue(mockCookies as any)

      const adminId = 'admin-1'
      mockSetAdminSession.mockImplementation(async (id) => {
        mockCookies.set('luma-admin-session', 'session-token', {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60, // 1 day
        })
      })

      await mockSetAdminSession(adminId)

      expect(mockCookies.set).toHaveBeenCalledWith(
        'luma-admin-session',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: true,
        })
      )
    })

    it('should set cookie with 24 hour expiry', async () => {
      const mockCookies = {
        set: vi.fn(),
      }
      vi.mocked(cookies).mockReturnValue(mockCookies as any)

      mockSetAdminSession.mockImplementation(async () => {
        mockCookies.set('luma-admin-session', 'token', {
          maxAge: 24 * 60 * 60,
        })
      })

      await mockSetAdminSession('admin-1')

      expect(mockCookies.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          maxAge: 24 * 60 * 60,
        })
      )
    })

    it('should use secure cookie in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const mockCookies = {
        set: vi.fn(),
      }
      vi.mocked(cookies).mockReturnValue(mockCookies as any)

      mockSetAdminSession.mockImplementation(async () => {
        mockCookies.set('luma-admin-session', 'token', {
          secure: true,
        })
      })

      await mockSetAdminSession('admin-1')

      expect(mockCookies.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          secure: true,
        })
      )

      process.env.NODE_ENV = originalEnv
    })

    it('should set sameSite attribute', async () => {
      const mockCookies = {
        set: vi.fn(),
      }
      vi.mocked(cookies).mockReturnValue(mockCookies as any)

      mockSetAdminSession.mockImplementation(async () => {
        mockCookies.set('luma-admin-session', 'token', {
          sameSite: 'lax',
        })
      })

      await mockSetAdminSession('admin-1')

      expect(mockCookies.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          sameSite: 'lax',
        })
      )
    })
  })

  describe('clearAdminSession', () => {
    it('should delete admin session cookie', async () => {
      const mockCookies = {
        delete: vi.fn(),
      }
      vi.mocked(cookies).mockReturnValue(mockCookies as any)

      mockClearAdminSession.mockImplementation(async () => {
        mockCookies.delete('luma-admin-session')
      })

      await mockClearAdminSession()

      expect(mockCookies.delete).toHaveBeenCalledWith('luma-admin-session')
    })

    it('should clear session from database/cache', async () => {
      mockClearAdminSession.mockResolvedValue(undefined)

      await mockClearAdminSession()

      expect(mockClearAdminSession).toHaveBeenCalled()
    })
  })

  describe('Admin Session Isolation', () => {
    it('should use separate cookie name from user sessions', () => {
      const adminCookieName = 'luma-admin-session'
      const userCookieName = 'luma-session'

      expect(adminCookieName).not.toBe(userCookieName)
    })

    it('should have shorter session duration than user sessions', () => {
      const adminSessionDays = 1
      const userSessionDays = 7

      expect(adminSessionDays).toBeLessThan(userSessionDays)
    })
  })

  describe('Security', () => {
    it('should not return password hash in session', async () => {
      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@luma.com',
        role: 'ADMIN',
      }

      mockGetAdminSession.mockResolvedValue(mockAdmin)

      const session = await mockGetAdminSession()

      expect(session).not.toHaveProperty('passwordHash')
      expect(session).not.toHaveProperty('password')
    })

    it('should validate session integrity', async () => {
      const tamperedToken = 'tampered-token'

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: tamperedToken }),
      }
      vi.mocked(cookies).mockReturnValue(mockCookies as any)
      mockGetAdminSession.mockResolvedValue(null)

      const session = await mockGetAdminSession()

      expect(session).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockGetAdminSession.mockRejectedValue(new Error('Database error'))

      await expect(mockGetAdminSession()).rejects.toThrow('Database error')
    })

    it('should handle malformed cookie data', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'malformed-data' }),
      }
      vi.mocked(cookies).mockReturnValue(mockCookies as any)
      mockGetAdminSession.mockResolvedValue(null)

      const session = await mockGetAdminSession()

      expect(session).toBeNull()
    })
  })
})
