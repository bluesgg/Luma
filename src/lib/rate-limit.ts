interface RateLimitRecord {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

/**
 * In-memory store for rate limiting.
 *
 * PRODUCTION WARNING: This in-memory implementation does NOT work correctly
 * with multiple serverless instances (e.g., Vercel). Each instance maintains
 * its own memory, allowing attackers to bypass rate limits by hitting different instances.
 *
 * For production deployments, replace with:
 * - Upstash Redis (@upstash/ratelimit) for serverless
 * - Redis Cluster for traditional deployments
 * - Or use Vercel's built-in rate limiting if available
 *
 * @see https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 */
const rateLimitStore = new Map<string, RateLimitRecord>()

// Cleanup old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60 * 1000 // 1 minute
let lastCleanup = Date.now()

function cleanupExpiredEntries(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
  lastCleanup = now
}

/**
 * Create a rate limiter with the given configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  return function checkRateLimit(key: string): RateLimitResult {
    cleanupExpiredEntries()

    const now = Date.now()
    const record = rateLimitStore.get(key)

    // No existing record or window expired - create new record
    if (!record || now > record.resetTime) {
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime: now + config.windowMs,
      }
      rateLimitStore.set(key, newRecord)
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newRecord.resetTime,
      }
    }

    // Check if limit exceeded
    if (record.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      }
    }

    // Increment count
    record.count++
    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime,
    }
  }
}

// Pre-configured rate limiters for common use cases

/**
 * Auth rate limiter: 10 requests per 15 minutes
 * For login, register, password reset endpoints
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
})

/**
 * API rate limiter: 100 requests per minute
 * For general API endpoints
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
})

/**
 * AI rate limiter: 20 requests per minute
 * For AI endpoints (stricter due to cost)
 */
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
})

/**
 * Get rate limit key from request
 * Uses IP address or user ID if available
 */
export function getRateLimitKey(
  ip: string | null,
  userId?: string,
  endpoint?: string
): string {
  const identifier = userId ?? ip ?? 'anonymous'
  return endpoint ? `${endpoint}:${identifier}` : identifier
}
