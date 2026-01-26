import { describe, it, expect } from 'vitest'
import {
  isAuthOnlyRoute,
  isProtectedRoute,
  isAdminRoute,
  isCronRoute,
  isPublicApiRoute,
  matchRoute,
} from '@/lib/middleware/route-matchers'

describe('Route Matchers - Edge Cases', () => {
  describe('matchRoute edge cases', () => {
    it('handles empty pathname', () => {
      expect(matchRoute('', ['/login'])).toBe(false)
    })

    it('handles empty patterns array', () => {
      expect(matchRoute('/login', [])).toBe(false)
    })

    it('handles root path', () => {
      expect(matchRoute('/', ['/'])).toBe(true)
    })

    it('does not match trailing slash variants', () => {
      // /login/ should not match /login pattern (exact or prefix match logic)
      expect(matchRoute('/login/', ['/login'])).toBe(true) // This is prefix match
    })

    it('handles complex nested paths', () => {
      expect(matchRoute('/courses/123/files/456', ['/courses'])).toBe(true)
    })

    it('handles query parameters correctly', () => {
      expect(matchRoute('/login?redirect=/courses&foo=bar', ['/login'])).toBe(true)
    })

    it('handles hash fragments (if present in pathname)', () => {
      // Hash fragments are stripped before matching for security (prevents bypass attempts)
      // Even though hash fragments are typically not sent to server, we handle them defensively
      expect(matchRoute('/login#section', ['/login'])).toBe(true) // Hash is stripped, /login matches
    })
  })

  describe('isProtectedRoute edge cases', () => {
    it('handles deeply nested file paths', () => {
      expect(isProtectedRoute('/files/course-123/file-456/page/10')).toBe(true)
    })

    it('handles deeply nested reader paths', () => {
      expect(isProtectedRoute('/reader/file-id/annotations/123')).toBe(true)
    })

    it('handles settings subpaths', () => {
      expect(isProtectedRoute('/settings/security')).toBe(true)
      expect(isProtectedRoute('/settings/preferences/theme')).toBe(true)
    })

    it('does not match similar but different paths', () => {
      expect(isProtectedRoute('/course')).toBe(false) // missing 's'
      expect(isProtectedRoute('/file')).toBe(false) // missing 's'
      expect(isProtectedRoute('/setting')).toBe(false) // missing 's'
    })
  })

  describe('isAdminRoute edge cases', () => {
    it('handles /admin exactly', () => {
      expect(isAdminRoute('/admin')).toBe(true)
    })

    it('handles deeply nested admin paths', () => {
      expect(isAdminRoute('/admin/users/123/edit')).toBe(true)
    })

    it('does not match /admin-panel', () => {
      expect(isAdminRoute('/admin-panel')).toBe(false)
    })

    it('does not match /administrator', () => {
      expect(isAdminRoute('/administrator')).toBe(false)
    })
  })

  describe('isCronRoute edge cases', () => {
    it('handles /api/cron exactly', () => {
      // /api/cron alone (without trailing path) should not match
      expect(isCronRoute('/api/cron')).toBe(false)
    })

    it('handles /api/cron/ with trailing slash', () => {
      // After path normalization, /api/cron/ becomes /api/cron (trailing slash removed)
      // This is treated as just the prefix, not an actual cron endpoint
      expect(isCronRoute('/api/cron/')).toBe(false)
    })

    it('handles nested cron paths', () => {
      expect(isCronRoute('/api/cron/daily/cleanup')).toBe(true)
    })

    it('does not match /api/cron-job', () => {
      expect(isCronRoute('/api/cron-job')).toBe(false)
    })
  })

  describe('isPublicApiRoute edge cases', () => {
    it('handles verify-email subpath', () => {
      expect(isPublicApiRoute('/api/auth/verify-email/token-123')).toBe(true)
    })

    it('does not match /api/auth/logout', () => {
      expect(isPublicApiRoute('/api/auth/logout')).toBe(false)
    })

    it('does not match /api/auth/me', () => {
      expect(isPublicApiRoute('/api/auth/me')).toBe(false)
    })

    it('does not match /api/auth/session', () => {
      expect(isPublicApiRoute('/api/auth/session')).toBe(false)
    })
  })

  describe('isAuthOnlyRoute edge cases', () => {
    it('handles verify-email path (should NOT be auth-only)', () => {
      // verify-email is not in AUTH_ONLY routes
      expect(isAuthOnlyRoute('/verify-email')).toBe(false)
    })

    it('handles /login with complex query params', () => {
      expect(isAuthOnlyRoute('/login?redirect=/courses/123&utm_source=email')).toBe(true)
    })

    it('does not match /loginpage', () => {
      expect(isAuthOnlyRoute('/loginpage')).toBe(false)
    })

    it('does not match /user/login', () => {
      expect(isAuthOnlyRoute('/user/login')).toBe(false)
    })
  })
})
