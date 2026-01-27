import type { NextRequest } from 'next/server'
import { successResponse, handleError } from '@/lib/api-response'
import { getCsrfToken } from '@/lib/csrf-server'

/**
 * GET /api/csrf - Get CSRF token
 */
export async function GET(_request: NextRequest) {
  try {
    const token = await getCsrfToken()

    const response = successResponse({ csrfToken: token })

    // Set CSRF token as HTTP-only cookie
    response.cookies.set('csrf-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return response
  } catch (error) {
    return handleError(error)
  }
}
