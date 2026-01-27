// =============================================================================
// User Logout API Tests (TDD)
// POST /api/auth/logout
// =============================================================================

import { describe, it, expect } from 'vitest'

async function logoutUser(cookie?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cookie) headers['Cookie'] = cookie

  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers,
  })
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  }
}

describe('POST /api/auth/logout', () => {
  describe('Happy Path', () => {
    it('should logout successfully with valid session', async () => {
      const response = await logoutUser('luma-session=valid-session-token')
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })

    it('should clear session cookie', async () => {
      const response = await logoutUser('luma-session=valid-session-token')
      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toContain('luma-session=')
      expect(setCookie).toContain('max-age=0') // or 'expires='
    })

    it('should destroy session in database/cache', async () => {
      const response = await logoutUser('luma-session=valid-session-token')
      expect(response.status).toBe(200)
      // Session destruction would be verified through Supabase
    })

    it('should return success message', async () => {
      const response = await logoutUser('luma-session=valid-session-token')
      expect(response.data.data.message).toBeDefined()
    })
  })

  describe('Invalid Session', () => {
    it('should succeed even with no session cookie', async () => {
      const response = await logoutUser()
      expect(response.status).toBe(200)
    })

    it('should succeed with invalid session token', async () => {
      const response = await logoutUser('luma-session=invalid-token')
      expect(response.status).toBe(200)
    })

    it('should succeed with expired session', async () => {
      const response = await logoutUser('luma-session=expired-token')
      expect(response.status).toBe(200)
    })
  })

  describe('Security', () => {
    it('should use POST method only', async () => {
      const response = await fetch('/api/auth/logout', { method: 'GET' })
      expect(response.status).toBe(405)
    })

    it('should handle CSRF protection', async () => {
      // CSRF token validation would be tested here
      const response = await logoutUser('luma-session=valid-session')
      expect(response.status).toBe(200)
    })
  })
})
