import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Mock the Supabase createServerClient
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}))

// Mock the env module
vi.mock('@/lib/env', () => ({
  supabaseConfig: {
    url: 'https://test.supabase.co',
    anonKey: 'test-anon-key',
  },
  cronConfig: {
    secret: 'test-cron-secret',
  },
}))

import { createServerClient } from '@supabase/ssr'

const mockCreateServerClient = createServerClient as Mock

function createMockRequest(pathname: string, headers?: Record<string, string>): NextRequest {
  const url = new URL(pathname, 'http://localhost:3000')
  const request = new NextRequest(url, {
    headers: new Headers(headers),
  })
  return request
}

function mockUser(user: { id: string; email: string } | null) {
  mockCreateServerClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
  })
}

describe('Authentication Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CRON Routes (/api/cron/*)', () => {
    it('returns 401 for missing CRON_SECRET', async () => {
      mockUser(null)
      const request = createMockRequest('/api/cron/quota-reset')
      const response = await updateSession(request)

      expect(response.status).toBe(401)
    })

    it('returns 401 for invalid CRON_SECRET', async () => {
      mockUser(null)
      const request = createMockRequest('/api/cron/quota-reset', {
        Authorization: 'Bearer invalid-secret',
      })
      const response = await updateSession(request)

      expect(response.status).toBe(401)
    })

    it('allows request with valid CRON_SECRET', async () => {
      mockUser(null)
      const request = createMockRequest('/api/cron/quota-reset', {
        Authorization: 'Bearer test-cron-secret',
      })
      const response = await updateSession(request)

      expect(response.status).not.toBe(401)
    })
  })

  describe('Auth-only Routes (login, register, etc.)', () => {
    it('redirects authenticated user from /login to /courses', async () => {
      mockUser({ id: 'user-1', email: 'test@example.com' })
      const request = createMockRequest('/login')
      const response = await updateSession(request)

      expect(response.status).toBe(307) // Temporary redirect
      expect(response.headers.get('location')).toContain('/courses')
    })

    it('redirects authenticated user from /register to /courses', async () => {
      mockUser({ id: 'user-1', email: 'test@example.com' })
      const request = createMockRequest('/register')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/courses')
    })

    it('redirects authenticated user from /forgot-password to /courses', async () => {
      mockUser({ id: 'user-1', email: 'test@example.com' })
      const request = createMockRequest('/forgot-password')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/courses')
    })

    it('redirects authenticated user from /reset-password to /courses', async () => {
      mockUser({ id: 'user-1', email: 'test@example.com' })
      const request = createMockRequest('/reset-password')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/courses')
    })

    it('allows unauthenticated user to access /login', async () => {
      mockUser(null)
      const request = createMockRequest('/login')
      const response = await updateSession(request)

      // Should pass through (not redirect)
      expect(response.status).not.toBe(307)
    })

    it('allows unauthenticated user to access /register', async () => {
      mockUser(null)
      const request = createMockRequest('/register')
      const response = await updateSession(request)

      expect(response.status).not.toBe(307)
    })
  })

  describe('Protected Routes (courses, files, reader, settings)', () => {
    it('redirects unauthenticated user from /courses to /login', async () => {
      mockUser(null)
      const request = createMockRequest('/courses')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('redirects unauthenticated user from /courses/123 to /login', async () => {
      mockUser(null)
      const request = createMockRequest('/courses/123')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('redirects unauthenticated user from /files/abc to /login', async () => {
      mockUser(null)
      const request = createMockRequest('/files/abc')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('redirects unauthenticated user from /reader/file-id to /login', async () => {
      mockUser(null)
      const request = createMockRequest('/reader/file-id')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('redirects unauthenticated user from /settings to /login', async () => {
      mockUser(null)
      const request = createMockRequest('/settings')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('allows authenticated user to access /courses', async () => {
      mockUser({ id: 'user-1', email: 'test@example.com' })
      const request = createMockRequest('/courses')
      const response = await updateSession(request)

      // Should pass through (not redirect)
      expect(response.status).not.toBe(307)
    })

    it('allows authenticated user to access /files/abc', async () => {
      mockUser({ id: 'user-1', email: 'test@example.com' })
      const request = createMockRequest('/files/abc')
      const response = await updateSession(request)

      expect(response.status).not.toBe(307)
    })

    it('allows authenticated user to access /reader/file-id', async () => {
      mockUser({ id: 'user-1', email: 'test@example.com' })
      const request = createMockRequest('/reader/file-id')
      const response = await updateSession(request)

      expect(response.status).not.toBe(307)
    })

    it('allows authenticated user to access /settings', async () => {
      mockUser({ id: 'user-1', email: 'test@example.com' })
      const request = createMockRequest('/settings')
      const response = await updateSession(request)

      expect(response.status).not.toBe(307)
    })
  })

  describe('Admin Routes (/admin/*)', () => {
    it('redirects unauthenticated user from /admin to /admin/login', async () => {
      mockUser(null)
      const request = createMockRequest('/admin')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/admin/login')
    })

    it('redirects unauthenticated user from /admin/users to /admin/login', async () => {
      mockUser(null)
      const request = createMockRequest('/admin/users')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/admin/login')
    })

    it('allows unauthenticated user to access /admin/login', async () => {
      mockUser(null)
      const request = createMockRequest('/admin/login')
      const response = await updateSession(request)

      // Admin login page should be accessible without auth
      expect(response.status).not.toBe(307)
    })

    it('allows authenticated user to access /admin', async () => {
      mockUser({ id: 'admin-1', email: 'admin@example.com' })
      const request = createMockRequest('/admin')
      const response = await updateSession(request)

      // Should pass through (role check at route handler level)
      expect(response.status).not.toBe(307)
    })
  })

  describe('Public API Routes', () => {
    it('allows access to /api/auth/login without authentication', async () => {
      mockUser(null)
      const request = createMockRequest('/api/auth/login')
      const response = await updateSession(request)

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(307)
    })

    it('allows access to /api/auth/register without authentication', async () => {
      mockUser(null)
      const request = createMockRequest('/api/auth/register')
      const response = await updateSession(request)

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(307)
    })

    it('allows access to /api/auth/reset-password without authentication', async () => {
      mockUser(null)
      const request = createMockRequest('/api/auth/reset-password')
      const response = await updateSession(request)

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(307)
    })

    it('allows access to /api/auth/resend-verification without authentication', async () => {
      mockUser(null)
      const request = createMockRequest('/api/auth/resend-verification')
      const response = await updateSession(request)

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(307)
    })
  })

  describe('Protected API Routes', () => {
    it('passes through /api/courses (handled at route level)', async () => {
      mockUser(null)
      const request = createMockRequest('/api/courses')
      const response = await updateSession(request)

      // API routes handle auth at route level, not middleware
      expect(response.status).not.toBe(307)
    })
  })

  describe('Home Route (/)', () => {
    it('allows access to / for unauthenticated users', async () => {
      mockUser(null)
      const request = createMockRequest('/')
      const response = await updateSession(request)

      expect(response.status).not.toBe(307)
    })

    it('allows access to / for authenticated users', async () => {
      mockUser({ id: 'user-1', email: 'test@example.com' })
      const request = createMockRequest('/')
      const response = await updateSession(request)

      expect(response.status).not.toBe(307)
    })
  })
})
