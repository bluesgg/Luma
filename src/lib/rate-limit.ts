/**
 * Rate limiting implementation
 * Tracks requests in memory and enforces limits
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export class RateLimiter {
  private attempts: Map<string, RateLimitRecord> = new Map();

  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}

  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    // First attempt or window expired
    if (!record || now > record.resetAt) {
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

    // Rate limit exceeded
    if (record.count >= this.maxAttempts) {
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

  /**
   * Clean up expired entries to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.attempts.forEach((record, identifier) => {
      if (now > record.resetAt) {
        expiredKeys.push(identifier);
      }
    });

    expiredKeys.forEach(key => this.attempts.delete(key));
  }
}

// Pre-configured rate limiters for different endpoints
// 10 requests per 15 minutes for auth endpoints
export const authRateLimiter = new RateLimiter(10, 15 * 60 * 1000);

// 100 requests per minute for API endpoints
export const apiRateLimiter = new RateLimiter(100, 60 * 1000);

// 20 requests per minute for AI endpoints
export const aiRateLimiter = new RateLimiter(20, 60 * 1000);

// 5 requests per 15 minutes for email endpoints (verification, reset)
export const emailRateLimiter = new RateLimiter(5, 15 * 60 * 1000);

// Cleanup expired entries every 5 minutes
// Only in development (serverless environments don't support setInterval)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    authRateLimiter.cleanup();
    apiRateLimiter.cleanup();
    aiRateLimiter.cleanup();
    emailRateLimiter.cleanup();
  }, 5 * 60 * 1000);
} else if (process.env.NODE_ENV === 'production') {
  // In production, use Redis or another distributed cache instead of in-memory
  // This is a warning that in-memory rate limiting won't work in serverless
  if (typeof window === 'undefined') {
    const { logger } = require('@/lib/logger');
    logger.warn('In-memory rate limiting is not suitable for production serverless environments. Consider using Redis.');
  }
}

/**
 * Reset all rate limiters (useful for testing)
 */
export function resetAllRateLimiters(): void {
  authRateLimiter.resetAll();
  apiRateLimiter.resetAll();
  aiRateLimiter.resetAll();
  emailRateLimiter.resetAll();
}
