// =============================================================================
// Rate Limiting Utility Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Rate limiter implementation
interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

interface RateLimitRecord {
  count: number
  resetAt: number
}

class RateLimiter {
  private store: Map<string, RateLimitRecord>
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.store = new Map()
    this.config = config
  }

  async check(identifier: string): Promise<{
    allowed: boolean
    remaining: number
    resetAt: number
  }> {
    const now = Date.now()
    const record = this.store.get(identifier)

    // If no record or expired, create new record
    if (!record || record.resetAt <= now) {
      const resetAt = now + this.config.windowMs
      this.store.set(identifier, { count: 1, resetAt })
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt,
      }
    }

    // Check if limit exceeded
    if (record.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt,
      }
    }

    // Increment count
    record.count++
    this.store.set(identifier, record)

    return {
      allowed: true,
      remaining: this.config.maxRequests - record.count,
      resetAt: record.resetAt,
    }
  }

  async reset(identifier: string): Promise<void> {
    this.store.delete(identifier)
  }

  async clear(): Promise<void> {
    this.store.clear()
  }

  getStats(identifier: string): { count: number; resetAt: number } | null {
    const record = this.store.get(identifier)
    return record ? { count: record.count, resetAt: record.resetAt } : null
  }
}

// Pre-configured rate limiters
const createAuthLimiter = () =>
  new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  })

const createApiLimiter = () =>
  new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  })

const createAiLimiter = () =>
  new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  })

describe('Rate Limiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    vi.useFakeTimers()
    limiter = new RateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 5,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const result = await limiter.check('user-1')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('should track multiple requests', async () => {
      await limiter.check('user-1')
      await limiter.check('user-1')
      const result = await limiter.check('user-1')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
    })

    it('should block requests after limit exceeded', async () => {
      // Make 5 requests (hit the limit)
      for (let i = 0; i < 5; i++) {
        await limiter.check('user-1')
      }

      // 6th request should be blocked
      const result = await limiter.check('user-1')

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should return correct remaining count', async () => {
      const results = []
      for (let i = 0; i < 5; i++) {
        results.push(await limiter.check('user-1'))
      }

      expect(results[0].remaining).toBe(4)
      expect(results[1].remaining).toBe(3)
      expect(results[2].remaining).toBe(2)
      expect(results[3].remaining).toBe(1)
      expect(results[4].remaining).toBe(0)
    })
  })

  describe('Time Window', () => {
    it('should reset after time window expires', async () => {
      // Make 5 requests (hit the limit)
      for (let i = 0; i < 5; i++) {
        await limiter.check('user-1')
      }

      // Should be blocked
      let result = await limiter.check('user-1')
      expect(result.allowed).toBe(false)

      // Advance time past window
      vi.advanceTimersByTime(60001)

      // Should be allowed again
      result = await limiter.check('user-1')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('should maintain separate windows for different users', async () => {
      // User 1 makes requests
      await limiter.check('user-1')
      await limiter.check('user-1')

      // User 2 makes requests
      await limiter.check('user-2')

      const stats1 = limiter.getStats('user-1')
      const stats2 = limiter.getStats('user-2')

      expect(stats1?.count).toBe(2)
      expect(stats2?.count).toBe(1)
    })

    it('should return correct resetAt timestamp', async () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const result = await limiter.check('user-1')

      expect(result.resetAt).toBe(now + 60000)
    })
  })

  describe('Multiple Identifiers', () => {
    it('should track requests independently per identifier', async () => {
      await limiter.check('user-1')
      await limiter.check('user-1')
      await limiter.check('user-2')

      const stats1 = limiter.getStats('user-1')
      const stats2 = limiter.getStats('user-2')

      expect(stats1?.count).toBe(2)
      expect(stats2?.count).toBe(1)
    })

    it('should allow different identifiers to have different limits', async () => {
      // User 1 hits limit
      for (let i = 0; i < 5; i++) {
        await limiter.check('user-1')
      }

      // User 1 is blocked
      const result1 = await limiter.check('user-1')
      expect(result1.allowed).toBe(false)

      // User 2 is still allowed
      const result2 = await limiter.check('user-2')
      expect(result2.allowed).toBe(true)
    })
  })

  describe('Reset and Clear', () => {
    it('should reset specific identifier', async () => {
      await limiter.check('user-1')
      await limiter.check('user-1')

      expect(limiter.getStats('user-1')?.count).toBe(2)

      await limiter.reset('user-1')

      expect(limiter.getStats('user-1')).toBe(null)
    })

    it('should only reset specified identifier', async () => {
      await limiter.check('user-1')
      await limiter.check('user-2')

      await limiter.reset('user-1')

      expect(limiter.getStats('user-1')).toBe(null)
      expect(limiter.getStats('user-2')?.count).toBe(1)
    })

    it('should clear all rate limit data', async () => {
      await limiter.check('user-1')
      await limiter.check('user-2')
      await limiter.check('user-3')

      await limiter.clear()

      expect(limiter.getStats('user-1')).toBe(null)
      expect(limiter.getStats('user-2')).toBe(null)
      expect(limiter.getStats('user-3')).toBe(null)
    })
  })

  describe('Stats', () => {
    it('should return null for non-existent identifier', () => {
      const stats = limiter.getStats('non-existent')
      expect(stats).toBe(null)
    })

    it('should return correct stats', async () => {
      await limiter.check('user-1')
      await limiter.check('user-1')

      const stats = limiter.getStats('user-1')

      expect(stats).not.toBe(null)
      expect(stats?.count).toBe(2)
      expect(stats?.resetAt).toBeGreaterThan(Date.now())
    })
  })

  describe('Pre-configured Limiters', () => {
    it('should create auth limiter with correct config', async () => {
      const authLimiter = createAuthLimiter()

      // Should allow 10 requests in 15 minutes
      for (let i = 0; i < 10; i++) {
        const result = await authLimiter.check('user-1')
        expect(result.allowed).toBe(true)
      }

      // 11th request should be blocked
      const result = await authLimiter.check('user-1')
      expect(result.allowed).toBe(false)
    })

    it('should create API limiter with correct config', async () => {
      const apiLimiter = createApiLimiter()

      // Should allow 100 requests in 1 minute
      for (let i = 0; i < 100; i++) {
        const result = await apiLimiter.check('user-1')
        expect(result.allowed).toBe(true)
      }

      // 101st request should be blocked
      const result = await apiLimiter.check('user-1')
      expect(result.allowed).toBe(false)
    })

    it('should create AI limiter with correct config', async () => {
      const aiLimiter = createAiLimiter()

      // Should allow 20 requests in 1 minute
      for (let i = 0; i < 20; i++) {
        const result = await aiLimiter.check('user-1')
        expect(result.allowed).toBe(true)
      }

      // 21st request should be blocked
      const result = await aiLimiter.check('user-1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid sequential requests', async () => {
      const results = await Promise.all([
        limiter.check('user-1'),
        limiter.check('user-1'),
        limiter.check('user-1'),
      ])

      expect(results.every((r) => r.allowed)).toBe(true)
      expect(limiter.getStats('user-1')?.count).toBe(3)
    })

    it('should handle exact limit boundary', async () => {
      // Make exactly maxRequests requests
      for (let i = 0; i < 5; i++) {
        const result = await limiter.check('user-1')
        expect(result.allowed).toBe(true)
      }

      // Next request should be blocked
      const result = await limiter.check('user-1')
      expect(result.allowed).toBe(false)
    })

    it('should handle identifier with special characters', async () => {
      const identifier = 'user@example.com:192.168.1.1'
      const result = await limiter.check(identifier)

      expect(result.allowed).toBe(true)
      expect(limiter.getStats(identifier)).not.toBe(null)
    })

    it('should handle empty identifier', async () => {
      const result = await limiter.check('')

      expect(result.allowed).toBe(true)
      expect(limiter.getStats('')).not.toBe(null)
    })

    it('should handle very large window', async () => {
      const longLimiter = new RateLimiter({
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        maxRequests: 1000,
      })

      const result = await longLimiter.check('user-1')
      expect(result.allowed).toBe(true)
    })

    it('should handle very small window', async () => {
      const shortLimiter = new RateLimiter({
        windowMs: 1000, // 1 second
        maxRequests: 2,
      })

      await shortLimiter.check('user-1')
      await shortLimiter.check('user-1')

      const result = await shortLimiter.check('user-1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('Concurrent Access', () => {
    it('should handle concurrent requests correctly', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(limiter.check('user-1'))
      }

      const results = await Promise.all(promises)

      // First 5 should be allowed
      expect(results.slice(0, 5).every((r) => r.allowed)).toBe(true)

      // Remaining should be blocked
      expect(results.slice(5).every((r) => !r.allowed)).toBe(true)
    })
  })

  describe('Production Scenarios', () => {
    it('should handle auth endpoint rate limiting', async () => {
      const authLimiter = createAuthLimiter()
      const ipAddress = '192.168.1.100'

      // Simulate 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        const result = await authLimiter.check(ipAddress)
        expect(result.allowed).toBe(true)
      }

      // User should still have 5 attempts left
      const stats = authLimiter.getStats(ipAddress)
      expect(stats?.count).toBe(5)
    })

    it('should handle API rate limiting per user', async () => {
      const apiLimiter = createApiLimiter()

      // User makes 50 API calls
      for (let i = 0; i < 50; i++) {
        await apiLimiter.check('user-1')
      }

      const result = await apiLimiter.check('user-1')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(49)
    })

    it('should handle AI endpoint rate limiting', async () => {
      const aiLimiter = createAiLimiter()

      // User makes AI requests
      for (let i = 0; i < 20; i++) {
        await aiLimiter.check('user-1')
      }

      // Should be at limit
      const result = await aiLimiter.check('user-1')
      expect(result.allowed).toBe(false)
    })
  })
})
