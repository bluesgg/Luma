import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  isValidPassword,
  createAuthError,
  createAuthSuccess,
  getCurrentUser,
} from '@/lib/auth'
import { AUTH_ERROR_CODES, type ConfirmResetRequest } from '@/types'
import { logger } from '@/lib/logger'
import { requireCsrf } from '@/lib/csrf'
import { authRateLimiter, getRateLimitKey } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // CSRF validation
    const csrfError = await requireCsrf(request)
    if (csrfError) return csrfError

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
    const rateLimitResult = authRateLimiter(getRateLimitKey(ip, undefined, 'confirm-reset'))
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.RATE_LIMITED, 'Too many requests'),
        { status: 429 }
      )
    }

    let body: ConfirmResetRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'Invalid request body'),
        { status: 400 }
      )
    }
    const { password } = body

    // Validate password strength
    if (!password || !isValidPassword(password)) {
      return NextResponse.json(
        createAuthError(
          AUTH_ERROR_CODES.WEAK_PASSWORD,
          'Password must be at least 8 characters'
        ),
        { status: 400 }
      )
    }

    // User should already be authenticated via the magic link
    // The reset link creates a temporary session
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        createAuthError(
          AUTH_ERROR_CODES.SESSION_EXPIRED,
          'Password reset link has expired. Please request a new one'
        ),
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Update the password
    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      logger.error('Update password error', error, { action: 'confirm-reset' })

      if (error.message.includes('same as')) {
        return NextResponse.json(
          createAuthError(
            AUTH_ERROR_CODES.WEAK_PASSWORD,
            'New password must be different from your current password'
          ),
          { status: 400 }
        )
      }

      return NextResponse.json(
        createAuthError(
          AUTH_ERROR_CODES.INTERNAL_ERROR,
          'Failed to update password. Please try again'
        ),
        { status: 500 }
      )
    }

    return NextResponse.json(
      createAuthSuccess({
        message:
          'Password updated successfully. Please log in with your new password.',
      }),
      { status: 200 }
    )
  } catch (error) {
    logger.error('Confirm reset error', error, { action: 'confirm-reset' })
    return NextResponse.json(
      createAuthError(
        AUTH_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred'
      ),
      { status: 500 }
    )
  }
}
