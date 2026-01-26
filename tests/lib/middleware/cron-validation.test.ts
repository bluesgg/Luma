import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateCronSecret, CRON_SECRET_HEADER } from '@/lib/middleware/cron-validation'

describe('CRON Secret Validation', () => {
  const VALID_SECRET = 'test-cron-secret'

  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', VALID_SECRET)
  })

  describe('CRON_SECRET_HEADER', () => {
    it('should be Authorization', () => {
      expect(CRON_SECRET_HEADER).toBe('Authorization')
    })
  })

  describe('validateCronSecret', () => {
    it('returns true for valid Bearer token', () => {
      const headers = new Headers()
      headers.set('Authorization', `Bearer ${VALID_SECRET}`)

      expect(validateCronSecret(headers)).toBe(true)
    })

    it('returns false for missing Authorization header', () => {
      const headers = new Headers()

      expect(validateCronSecret(headers)).toBe(false)
    })

    it('returns false for invalid secret', () => {
      const headers = new Headers()
      headers.set('Authorization', 'Bearer invalid-secret')

      expect(validateCronSecret(headers)).toBe(false)
    })

    it('returns false for non-Bearer token', () => {
      const headers = new Headers()
      headers.set('Authorization', `Basic ${VALID_SECRET}`)

      expect(validateCronSecret(headers)).toBe(false)
    })

    it('returns false for Bearer without token', () => {
      const headers = new Headers()
      headers.set('Authorization', 'Bearer ')

      expect(validateCronSecret(headers)).toBe(false)
    })

    it('returns false for Bearer with extra whitespace', () => {
      const headers = new Headers()
      headers.set('Authorization', 'Bearer  test-cron-secret')

      expect(validateCronSecret(headers)).toBe(false)
    })

    it('is case-sensitive for the Bearer prefix', () => {
      const headers = new Headers()
      headers.set('Authorization', `bearer ${VALID_SECRET}`)

      expect(validateCronSecret(headers)).toBe(false)
    })

    it('is case-sensitive for the secret value', () => {
      const headers = new Headers()
      headers.set('Authorization', 'Bearer TEST-CRON-SECRET')

      expect(validateCronSecret(headers)).toBe(false)
    })

    it('handles null CRON_SECRET env var gracefully', () => {
      vi.stubEnv('CRON_SECRET', undefined)
      const headers = new Headers()
      headers.set('Authorization', `Bearer ${VALID_SECRET}`)

      expect(validateCronSecret(headers)).toBe(false)
    })

    it('handles empty CRON_SECRET env var', () => {
      vi.stubEnv('CRON_SECRET', '')
      const headers = new Headers()
      headers.set('Authorization', 'Bearer ')

      expect(validateCronSecret(headers)).toBe(false)
    })
  })
})
