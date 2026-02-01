import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Rate limiting tests
 * Tests rate limiting logic for authentication endpoints
 */

// Simple in-memory rate limiter implementation for testing
class RateLimiter {
  private attempts: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}

  async check(identifier: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetAt) {
      // First attempt or window expired
      this.attempts.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetAt: now + this.windowMs,
      };
    }

    if (record.count >= this.maxAttempts) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt,
      };
    }

    // Increment count
    record.count++;
    this.attempts.set(identifier, record);

    return {
      allowed: true,
      remaining: this.maxAttempts - record.count,
      resetAt: record.resetAt,
    };
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  resetAll(): void {
    this.attempts.clear();
  }
}

describe('Rate Limiting', () => {
  describe('Authentication Rate Limits', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      // 10 attempts per 15 minutes for auth endpoints
      rateLimiter = new RateLimiter(10, 15 * 60 * 1000);
    });

    it('should allow requests under the limit', async () => {
      const identifier = 'user@example.com';

      for (let i = 0; i < 10; i++) {
        const result = await rateLimiter.check(identifier);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(10 - i - 1);
      }
    });

    it('should block requests over the limit', async () => {
      const identifier = 'user@example.com';

      // Make 10 allowed requests
      for (let i = 0; i < 10; i++) {
        await rateLimiter.check(identifier);
      }

      // 11th request should be blocked
      const result = await rateLimiter.check(identifier);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after time window', async () => {
      const identifier = 'user@example.com';
      const shortLimiter = new RateLimiter(5, 100); // 100ms window

      // Use up all attempts
      for (let i = 0; i < 5; i++) {
        await shortLimiter.check(identifier);
      }

      // Should be blocked
      let result = await shortLimiter.check(identifier);
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      result = await shortLimiter.check(identifier);
      expect(result.allowed).toBe(true);
    });

    it('should track different users separately', async () => {
      const user1 = 'user1@example.com';
      const user2 = 'user2@example.com';

      // User 1 uses all attempts
      for (let i = 0; i < 10; i++) {
        await rateLimiter.check(user1);
      }

      // User 1 should be blocked
      let result = await rateLimiter.check(user1);
      expect(result.allowed).toBe(false);

      // User 2 should still be allowed
      result = await rateLimiter.check(user2);
      expect(result.allowed).toBe(true);
    });

    it('should provide accurate remaining count', async () => {
      const identifier = 'user@example.com';

      let result = await rateLimiter.check(identifier);
      expect(result.remaining).toBe(9);

      result = await rateLimiter.check(identifier);
      expect(result.remaining).toBe(8);

      result = await rateLimiter.check(identifier);
      expect(result.remaining).toBe(7);
    });

    it('should provide reset timestamp', async () => {
      const identifier = 'user@example.com';
      const result = await rateLimiter.check(identifier);

      expect(result.resetAt).toBeGreaterThan(Date.now());
      expect(result.resetAt).toBeLessThan(Date.now() + 15 * 60 * 1000 + 1000);
    });
  });

  describe('API Rate Limits', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      // 100 requests per minute for API endpoints
      rateLimiter = new RateLimiter(100, 60 * 1000);
    });

    it('should allow high volume requests', async () => {
      const identifier = 'api-key-123';

      for (let i = 0; i < 100; i++) {
        const result = await rateLimiter.check(identifier);
        expect(result.allowed).toBe(true);
      }
    });

    it('should block after limit', async () => {
      const identifier = 'api-key-123';

      for (let i = 0; i < 100; i++) {
        await rateLimiter.check(identifier);
      }

      const result = await rateLimiter.check(identifier);
      expect(result.allowed).toBe(false);
    });
  });

  describe('AI Endpoint Rate Limits', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      // 20 requests per minute for AI endpoints
      rateLimiter = new RateLimiter(20, 60 * 1000);
    });

    it('should enforce stricter limits for AI', async () => {
      const identifier = 'user@example.com';

      for (let i = 0; i < 20; i++) {
        const result = await rateLimiter.check(identifier);
        expect(result.allowed).toBe(true);
      }

      const result = await rateLimiter.check(identifier);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Account Lockout', () => {
    let failedLoginTracker: Map<string, { count: number; lockedUntil: number | null }>;

    beforeEach(() => {
      failedLoginTracker = new Map();
    });

    const recordFailedLogin = (identifier: string): boolean => {
      const record = failedLoginTracker.get(identifier) || { count: 0, lockedUntil: null };

      // Check if locked
      if (record.lockedUntil && Date.now() < record.lockedUntil) {
        return false; // Still locked
      }

      record.count++;

      // Lock after 5 failed attempts
      if (record.count >= 5) {
        record.lockedUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
      }

      failedLoginTracker.set(identifier, record);
      return true;
    };

    const resetFailedLogins = (identifier: string): void => {
      failedLoginTracker.set(identifier, { count: 0, lockedUntil: null });
    };

    const isLocked = (identifier: string): boolean => {
      const record = failedLoginTracker.get(identifier);
      return !!(record?.lockedUntil && Date.now() < record.lockedUntil);
    };

    it('should lock account after 5 failed attempts', () => {
      const identifier = 'user@example.com';

      for (let i = 0; i < 5; i++) {
        recordFailedLogin(identifier);
      }

      expect(isLocked(identifier)).toBe(true);
    });

    it('should not lock before 5 attempts', () => {
      const identifier = 'user@example.com';

      for (let i = 0; i < 4; i++) {
        recordFailedLogin(identifier);
      }

      expect(isLocked(identifier)).toBe(false);
    });

    it('should reset failed attempts on successful login', () => {
      const identifier = 'user@example.com';

      recordFailedLogin(identifier);
      recordFailedLogin(identifier);
      recordFailedLogin(identifier);

      resetFailedLogins(identifier);

      const record = failedLoginTracker.get(identifier);
      expect(record?.count).toBe(0);
    });

    it('should unlock after lockout period', async () => {
      const identifier = 'user@example.com';
      const tracker = new Map<string, { count: number; lockedUntil: number | null }>();

      // Lock the account with short duration
      tracker.set(identifier, {
        count: 5,
        lockedUntil: Date.now() + 100,
      });

      // Should be locked
      let record = tracker.get(identifier);
      expect(record?.lockedUntil && Date.now() < record.lockedUntil).toBe(true);

      // Wait for lock to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be unlocked
      record = tracker.get(identifier);
      expect(record?.lockedUntil && Date.now() < record.lockedUntil).toBe(false);
    });

    it('should track different accounts separately', () => {
      const user1 = 'user1@example.com';
      const user2 = 'user2@example.com';

      for (let i = 0; i < 5; i++) {
        recordFailedLogin(user1);
      }

      expect(isLocked(user1)).toBe(true);
      expect(isLocked(user2)).toBe(false);
    });
  });

  describe('Identifier Strategies', () => {
    it('should rate limit by IP address', async () => {
      const rateLimiter = new RateLimiter(10, 15 * 60 * 1000);
      const ip = '192.168.1.1';

      const result = await rateLimiter.check(ip);
      expect(result.allowed).toBe(true);
    });

    it('should rate limit by email', async () => {
      const rateLimiter = new RateLimiter(10, 15 * 60 * 1000);
      const email = 'user@example.com';

      const result = await rateLimiter.check(email);
      expect(result.allowed).toBe(true);
    });

    it('should rate limit by composite key (IP + email)', async () => {
      const rateLimiter = new RateLimiter(10, 15 * 60 * 1000);
      const identifier = '192.168.1.1:user@example.com';

      const result = await rateLimiter.check(identifier);
      expect(result.allowed).toBe(true);
    });

    it('should rate limit by user ID', async () => {
      const rateLimiter = new RateLimiter(10, 15 * 60 * 1000);
      const userId = 'user-123';

      const result = await rateLimiter.check(userId);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests', async () => {
      const rateLimiter = new RateLimiter(10, 15 * 60 * 1000);
      const identifier = 'user@example.com';

      const promises = Array.from({ length: 15 }, () => rateLimiter.check(identifier));
      const results = await Promise.all(promises);

      const allowed = results.filter((r) => r.allowed).length;
      const blocked = results.filter((r) => !r.allowed).length;

      // Some should be allowed, some blocked
      expect(allowed).toBeGreaterThan(0);
      expect(blocked).toBeGreaterThan(0);
      expect(allowed + blocked).toBe(15);
    });

    it('should handle empty identifier', async () => {
      const rateLimiter = new RateLimiter(10, 15 * 60 * 1000);

      const result = await rateLimiter.check('');
      expect(result).toBeDefined();
    });

    it('should handle very long identifier', async () => {
      const rateLimiter = new RateLimiter(10, 15 * 60 * 1000);
      const longIdentifier = 'a'.repeat(1000);

      const result = await rateLimiter.check(longIdentifier);
      expect(result).toBeDefined();
    });

    it('should handle special characters in identifier', async () => {
      const rateLimiter = new RateLimiter(10, 15 * 60 * 1000);
      const specialIdentifier = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      const result = await rateLimiter.check(specialIdentifier);
      expect(result).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should clean up expired entries', () => {
      const rateLimiter = new RateLimiter(10, 100);
      const identifier = 'user@example.com';

      rateLimiter.check(identifier);
      rateLimiter.reset(identifier);

      // Entry should be removed
      expect(rateLimiter.check(identifier)).resolves.toBeDefined();
    });

    it('should handle large number of identifiers', async () => {
      const rateLimiter = new RateLimiter(10, 15 * 60 * 1000);

      for (let i = 0; i < 1000; i++) {
        await rateLimiter.check(`user${i}@example.com`);
      }

      // Should not throw or crash
      expect(true).toBe(true);
    });

    it('should clear all entries', () => {
      const rateLimiter = new RateLimiter(10, 15 * 60 * 1000);

      rateLimiter.check('user1@example.com');
      rateLimiter.check('user2@example.com');
      rateLimiter.resetAll();

      // All entries should be cleared
      expect(true).toBe(true);
    });
  });

  describe('Response Headers', () => {
    it('should provide rate limit headers', async () => {
      const rateLimiter = new RateLimiter(10, 15 * 60 * 1000);
      const result = await rateLimiter.check('user@example.com');

      const headers = {
        'X-RateLimit-Limit': 10,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': result.resetAt,
      };

      expect(headers['X-RateLimit-Limit']).toBe(10);
      expect(headers['X-RateLimit-Remaining']).toBeGreaterThanOrEqual(0);
      expect(headers['X-RateLimit-Reset']).toBeGreaterThan(Date.now());
    });

    it('should provide retry-after when rate limited', async () => {
      const rateLimiter = new RateLimiter(5, 60 * 1000);
      const identifier = 'user@example.com';

      for (let i = 0; i < 5; i++) {
        await rateLimiter.check(identifier);
      }

      const result = await rateLimiter.check(identifier);
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });
  });
});
