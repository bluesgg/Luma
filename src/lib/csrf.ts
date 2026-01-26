import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual as cryptoTimingSafeEqual } from 'crypto'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomUUID()
}

/**
 * Set CSRF token in httpOnly cookie and return it
 * Call this when rendering pages that contain forms
 */
export async function setCsrfCookie(): Promise<string> {
  const token = generateCsrfToken()
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return token
}

/**
 * Get the current CSRF token from cookies
 */
export async function getCsrfToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(CSRF_COOKIE_NAME)?.value
}

/**
 * Validate CSRF token from request header against cookie
 * Uses Double-Submit Cookie pattern
 */
export async function validateCsrf(request: NextRequest): Promise<boolean> {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  // Both must exist and match
  if (!cookieToken || !headerToken) {
    return false
  }

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken)
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Uses Node.js built-in crypto.timingSafeEqual for constant-time comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  // Convert strings to buffers
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')

  // For different lengths, still perform constant-time work to prevent timing leaks
  if (bufA.length !== bufB.length) {
    // Do a dummy comparison to maintain constant time execution
    cryptoTimingSafeEqual(bufA, bufA)
    return false
  }

  // Use Node.js built-in constant-time comparison
  return cryptoTimingSafeEqual(bufA, bufB)
}

/**
 * Helper to create CSRF validation error response
 */
export function csrfError() {
  return {
    success: false,
    error: {
      code: 'CSRF_INVALID',
      message: 'Invalid or missing CSRF token',
    },
  }
}

/**
 * Middleware-style CSRF validator for API routes
 * Returns error response if validation fails, null if valid
 */
export async function requireCsrf(request: NextRequest): Promise<NextResponse | null> {
  const isValid = await validateCsrf(request)

  if (!isValid) {
    return NextResponse.json(csrfError(), { status: 403 })
  }

  return null
}
