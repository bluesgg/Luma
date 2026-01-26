/**
 * The header used for CRON secret validation
 */
export const CRON_SECRET_HEADER = 'Authorization'

/**
 * Bearer token prefix
 */
const BEARER_PREFIX = 'Bearer '

/**
 * Minimum recommended length for CRON_SECRET
 */
const MIN_SECRET_LENGTH = 32

/**
 * Flag to track if short secret warning has been logged (prevent log flooding)
 */
let shortSecretWarned = false

/**
 * Constant-time string comparison to prevent timing attacks.
 * Always compares in constant time regardless of string content.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal
 */
function constantTimeCompare(a: string, b: string): boolean {
  // Use the longer length to ensure we always do the same amount of work
  const compareLength = Math.max(a.length, b.length)

  let result = 0
  for (let i = 0; i < compareLength; i++) {
    // Use 0 for out-of-bounds characters to maintain constant time
    const aChar = i < a.length ? a.charCodeAt(i) : 0
    const bChar = i < b.length ? b.charCodeAt(i) : 0
    result |= aChar ^ bChar
  }

  // Both lengths must match AND all characters must match
  return a.length === b.length && result === 0
}

/**
 * Validates the CRON secret from request headers using Bearer token format.
 *
 * SECURITY NOTES:
 * - Uses constant-time comparison to prevent timing attacks
 * - Fails closed (rejects if CRON_SECRET not configured)
 * - Logs warnings for security misconfigurations (short secret, missing config)
 * - Expected to run in Edge Runtime (middleware context)
 *
 * Expected header format: "Authorization: Bearer <CRON_SECRET>"
 *
 * @param headers - The request headers from NextRequest
 * @returns true if the CRON secret is valid and matches, false otherwise
 *
 * @example
 * ```typescript
 * if (!validateCronSecret(request.headers)) {
 *   return new NextResponse('Unauthorized', { status: 401 })
 * }
 * ```
 */
export function validateCronSecret(headers: Headers): boolean {
  const cronSecret = process.env.CRON_SECRET

  // If CRON_SECRET is not configured, reject all requests
  if (!cronSecret) {
    console.warn('[SECURITY] CRON_SECRET not configured - all CRON requests will be rejected')
    return false
  }

  // Warn if secret is too short (only log once to prevent log flooding)
  if (cronSecret.length < MIN_SECRET_LENGTH && !shortSecretWarned) {
    console.warn(`[SECURITY] CRON_SECRET is too short (${cronSecret.length} chars) - should be at least ${MIN_SECRET_LENGTH} characters`)
    shortSecretWarned = true
  }

  const authHeader = headers.get(CRON_SECRET_HEADER)

  if (!authHeader) {
    return false
  }

  // Check for Bearer prefix (case-sensitive)
  if (!authHeader.startsWith(BEARER_PREFIX)) {
    return false
  }

  // Extract the token (everything after "Bearer ")
  const token = authHeader.slice(BEARER_PREFIX.length)

  // Token must not be empty
  if (!token) {
    return false
  }

  // Use constant-time comparison to prevent timing attacks
  return constantTimeCompare(token, cronSecret)
}
