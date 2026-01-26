import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidEmail, createAuthError, createAuthSuccess } from '@/lib/auth'
import { AUTH_ERROR_CODES, type ResendVerificationRequest } from '@/types'
import { logger } from '@/lib/logger'
import { authRateLimiter, getRateLimitKey } from '@/lib/rate-limit'
import { getValidatedRedirectUrl } from '@/lib/url-validation'
import { requireCsrf } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  try {
    // CSRF validation
    const csrfError = await requireCsrf(request)
    if (csrfError) return csrfError

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
    const rateLimitResult = authRateLimiter(getRateLimitKey(ip, undefined, 'resend-verification'))
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.RATE_LIMITED, 'Too many requests. Please try again later'),
        { status: 429 }
      )
    }

    let body: ResendVerificationRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'Invalid request body'),
        { status: 400 }
      )
    }
    const { email } = body

    // Validate email format
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        createAuthError(
          AUTH_ERROR_CODES.INVALID_EMAIL,
          'Please enter a valid email address'
        ),
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Resend verification email via Supabase
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: getValidatedRedirectUrl(
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          '/login?verified=true'
        ),
      },
    })

    if (error) {
      // Handle rate limiting
      if (
        error.message.includes('rate limit') ||
        error.message.includes('too many')
      ) {
        return NextResponse.json(
          createAuthError(
            AUTH_ERROR_CODES.RATE_LIMITED,
            'Too many requests. Please wait before requesting another email'
          ),
          { status: 429 }
        )
      }

      logger.error('Resend verification error', error, { action: 'resend-verification' })
      // Don't reveal if email exists or not for security
      // Return success anyway
    }

    // Always return success for security (don't reveal if email exists)
    return NextResponse.json(
      createAuthSuccess({
        message:
          'If an account with this email exists and is unverified, a verification email has been sent',
      }),
      { status: 200 }
    )
  } catch (error) {
    logger.error('Resend verification error', error, { action: 'resend-verification' })
    return NextResponse.json(
      createAuthError(
        AUTH_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred'
      ),
      { status: 500 }
    )
  }
}
