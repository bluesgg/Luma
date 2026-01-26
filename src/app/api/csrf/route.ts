import { NextRequest, NextResponse } from 'next/server'
import { setCsrfCookie, getCsrfToken } from '@/lib/csrf'
import { apiRateLimiter, getRateLimitKey } from '@/lib/rate-limit'

/**
 * GET /api/csrf
 * Returns a CSRF token for client-side forms
 * Also sets/refreshes the httpOnly cookie
 */
export async function GET(request: NextRequest) {
  // Rate limiting to prevent token generation abuse
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
  const rateLimitResult = apiRateLimiter(getRateLimitKey(ip, undefined, 'csrf'))
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      { status: 429 }
    )
  }

  // Check if we already have a valid token
  let token = await getCsrfToken()

  // If no token exists, generate a new one
  if (!token) {
    token = await setCsrfCookie()
  }

  return NextResponse.json({ token })
}
