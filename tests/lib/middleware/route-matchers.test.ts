import { describe, it, expect } from 'vitest'
import {
  isAuthOnlyRoute,
  isProtectedRoute,
  isAdminRoute,
  isCronRoute,
  isPublicApiRoute,
  matchRoute,
} from '@/lib/middleware/route-matchers'

describe('Route Matchers', () => {
  describe('isAuthOnlyRoute', () => {
    it('returns true for /login', () => {
      expect(isAuthOnlyRoute('/login')).toBe(true)
    })

    it('returns true for /register', () => {
      expect(isAuthOnlyRoute('/register')).toBe(true)
    })

    it('returns true for /forgot-password', () => {
      expect(isAuthOnlyRoute('/forgot-password')).toBe(true)
    })

    it('returns true for /reset-password', () => {
      expect(isAuthOnlyRoute('/reset-password')).toBe(true)
    })

    it('returns true for /reset-password with token query param', () => {
      expect(isAuthOnlyRoute('/reset-password?token=abc123')).toBe(true)
    })

    it('returns false for /courses', () => {
      expect(isAuthOnlyRoute('/courses')).toBe(false)
    })

    it('returns false for /', () => {
      expect(isAuthOnlyRoute('/')).toBe(false)
    })

    it('returns false for /api/auth/login', () => {
      expect(isAuthOnlyRoute('/api/auth/login')).toBe(false)
    })
  })

  describe('isProtectedRoute', () => {
    it('returns true for /courses', () => {
      expect(isProtectedRoute('/courses')).toBe(true)
    })

    it('returns true for /courses/123', () => {
      expect(isProtectedRoute('/courses/123')).toBe(true)
    })

    it('returns true for /files/abc-123', () => {
      expect(isProtectedRoute('/files/abc-123')).toBe(true)
    })

    it('returns true for /files/course-id/file-id', () => {
      expect(isProtectedRoute('/files/course-id/file-id')).toBe(true)
    })

    it('returns true for /reader/file-id', () => {
      expect(isProtectedRoute('/reader/file-id')).toBe(true)
    })

    it('returns true for /reader/file-id/page/5', () => {
      expect(isProtectedRoute('/reader/file-id/page/5')).toBe(true)
    })

    it('returns true for /settings', () => {
      expect(isProtectedRoute('/settings')).toBe(true)
    })

    it('returns true for /settings/profile', () => {
      expect(isProtectedRoute('/settings/profile')).toBe(true)
    })

    it('returns false for /login', () => {
      expect(isProtectedRoute('/login')).toBe(false)
    })

    it('returns false for /register', () => {
      expect(isProtectedRoute('/register')).toBe(false)
    })

    it('returns false for /admin', () => {
      expect(isProtectedRoute('/admin')).toBe(false)
    })

    it('returns false for /api/courses', () => {
      expect(isProtectedRoute('/api/courses')).toBe(false)
    })

    it('returns false for /', () => {
      expect(isProtectedRoute('/')).toBe(false)
    })
  })

  describe('isAdminRoute', () => {
    it('returns true for /admin', () => {
      expect(isAdminRoute('/admin')).toBe(true)
    })

    it('returns true for /admin/users', () => {
      expect(isAdminRoute('/admin/users')).toBe(true)
    })

    it('returns true for /admin/dashboard', () => {
      expect(isAdminRoute('/admin/dashboard')).toBe(true)
    })

    it('returns true for /admin/login', () => {
      expect(isAdminRoute('/admin/login')).toBe(true)
    })

    it('returns false for /courses', () => {
      expect(isAdminRoute('/courses')).toBe(false)
    })

    it('returns false for /api/admin', () => {
      expect(isAdminRoute('/api/admin')).toBe(false)
    })
  })

  describe('isCronRoute', () => {
    it('returns true for /api/cron/quota-reset', () => {
      expect(isCronRoute('/api/cron/quota-reset')).toBe(true)
    })

    it('returns true for /api/cron/cleanup', () => {
      expect(isCronRoute('/api/cron/cleanup')).toBe(true)
    })

    it('returns false for /api/courses', () => {
      expect(isCronRoute('/api/courses')).toBe(false)
    })

    it('returns false for /cron', () => {
      expect(isCronRoute('/cron')).toBe(false)
    })
  })

  describe('isPublicApiRoute', () => {
    it('returns true for /api/auth/login', () => {
      expect(isPublicApiRoute('/api/auth/login')).toBe(true)
    })

    it('returns true for /api/auth/register', () => {
      expect(isPublicApiRoute('/api/auth/register')).toBe(true)
    })

    it('returns true for /api/auth/reset-password', () => {
      expect(isPublicApiRoute('/api/auth/reset-password')).toBe(true)
    })

    it('returns true for /api/auth/resend-verification', () => {
      expect(isPublicApiRoute('/api/auth/resend-verification')).toBe(true)
    })

    it('returns true for /api/auth/verify-email', () => {
      expect(isPublicApiRoute('/api/auth/verify-email')).toBe(true)
    })

    it('returns false for /api/auth/logout', () => {
      expect(isPublicApiRoute('/api/auth/logout')).toBe(false)
    })

    it('returns false for /api/courses', () => {
      expect(isPublicApiRoute('/api/courses')).toBe(false)
    })
  })

  describe('matchRoute', () => {
    it('matches exact paths', () => {
      expect(matchRoute('/login', ['/login'])).toBe(true)
    })

    it('matches path prefixes', () => {
      expect(matchRoute('/courses/123', ['/courses'])).toBe(true)
    })

    it('does not match partial path segments', () => {
      // /coursesextra should not match /courses as a prefix
      expect(matchRoute('/coursesextra', ['/courses'])).toBe(false)
    })

    it('returns false when no patterns match', () => {
      expect(matchRoute('/unknown', ['/login', '/register'])).toBe(false)
    })

    it('handles paths with query parameters', () => {
      expect(matchRoute('/login?redirect=/courses', ['/login'])).toBe(true)
    })
  })
})
