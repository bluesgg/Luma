import { RATE_LIMITS } from './constants'

/**
 * In-memory rate limiter (for development)
 * TODO: Replace with Redis/Upstash for production
 */

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

/**
 * Check if a request should be rate limited
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{
  allowed: boolean
  remaining: number
  resetTime: number
}> {
  // Trigger periodic cleanup
  maybeCleanup()

  const now = Date.now()
  const entry = store.get(key)

  // If no entry or expired, create new one
  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs
    store.set(key, { count: 1, resetTime })

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment count
  entry.count++
  store.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Rate limit for authentication endpoints
 */
export async function authRateLimit(identifier: string) {
  return checkRateLimit(`auth:${identifier}`, RATE_LIMITS.AUTH)
}

/**
 * Rate limit for API endpoints
 */
export async function apiRateLimit(identifier: string) {
  return checkRateLimit(`api:${identifier}`, RATE_LIMITS.API)
}

/**
 * Rate limit for AI endpoints
 */
export async function aiRateLimit(identifier: string) {
  return checkRateLimit(`ai:${identifier}`, RATE_LIMITS.AI)
}

/**
 * Rate limit for email sending
 */
export async function emailRateLimit(identifier: string) {
  return checkRateLimit(`email:${identifier}`, RATE_LIMITS.EMAIL)
}

/**
 * Clear rate limit for a key (useful for testing)
 */
export function clearRateLimit(key: string): void {
  store.delete(key)
}

/**
 * Clean up expired entries on-demand
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key)
    }
  }
}

// Track last cleanup time
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Trigger cleanup if enough time has passed
 * This approach avoids memory leaks from setInterval
 */
function maybeCleanup(): void {
  const now = Date.now()
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    cleanupExpiredEntries()
    lastCleanup = now
  }
}
