import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  isValidEmail,
  createAuthError,
  createAuthSuccess,
  getUserProfile,
  recordLoginLog,
} from '@/lib/auth'
import { AUTH_ERROR_CODES, type LoginRequest } from '@/types'
import { logger } from '@/lib/logger'
import { authRateLimiter, getRateLimitKey } from '@/lib/rate-limit'
import { requireCsrf } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  try {
    // CSRF validation
    const csrfError = await requireCsrf(request)
    if (csrfError) return csrfError

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
    const rateLimitResult = authRateLimiter(getRateLimitKey(ip, undefined, 'login'))
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.RATE_LIMITED, 'Too many login attempts. Please try again later'),
        { status: 429 }
      )
    }

    let body: LoginRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'Invalid request body'),
        { status: 400 }
      )
    }
    const { email, password, rememberMe = false } = body

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

    // Validate password presence
    if (!password) {
      return NextResponse.json(
        createAuthError(
          AUTH_ERROR_CODES.INVALID_CREDENTIALS,
          'Please enter your password'
        ),
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Attempt to sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Handle specific Supabase errors
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          createAuthError(
            AUTH_ERROR_CODES.INVALID_CREDENTIALS,
            'Invalid email or password'
          ),
          { status: 401 }
        )
      }

      if (error.message.includes('Email not confirmed')) {
        return NextResponse.json(
          createAuthError(
            AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
            'Please verify your email before logging in'
          ),
          { status: 403 }
        )
      }

      if (
        error.message.includes('rate limit') ||
        error.message.includes('too many')
      ) {
        return NextResponse.json(
          createAuthError(
            AUTH_ERROR_CODES.RATE_LIMITED,
            'Too many login attempts. Please try again later'
          ),
          { status: 429 }
        )
      }

      logger.error('Supabase login error', error, { action: 'login' })
      return NextResponse.json(
        createAuthError(
          AUTH_ERROR_CODES.INTERNAL_ERROR,
          'Login failed. Please try again'
        ),
        { status: 500 }
      )
    }

    if (!data.user || !data.session) {
      return NextResponse.json(
        createAuthError(
          AUTH_ERROR_CODES.INTERNAL_ERROR,
          'Login failed. Please try again'
        ),
        { status: 500 }
      )
    }

    // Get user profile
    const profile = await getUserProfile(data.user.id)

    if (!profile) {
      logger.error('Profile not found for user', undefined, { userId: data.user.id, action: 'login' })
      return NextResponse.json(
        createAuthError(
          AUTH_ERROR_CODES.INTERNAL_ERROR,
          'Account configuration error. Please contact support'
        ),
        { status: 500 }
      )
    }

    // Record login access log
    await recordLoginLog(data.user.id, {
      userAgent: request.headers.get('user-agent'),
      rememberMe,
    })

    // Note: Session duration is managed by Supabase based on project settings
    // The rememberMe flag can be used for frontend session persistence hints

    // Note: Session is managed via httpOnly cookies by Supabase
    // We only expose the expiry time for UI purposes, not the token itself
    return NextResponse.json(
      createAuthSuccess({
        user: {
          id: data.user.id,
          email: data.user.email ?? '',
          emailConfirmedAt: data.user.email_confirmed_at ?? null,
          createdAt: data.user.created_at,
        },
        profile: {
          userId: profile.userId,
          role: profile.role,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        },
        sessionExpiresAt: data.session.expires_at,
      }),
      { status: 200 }
    )
  } catch (error) {
    logger.error('Login error', error, { action: 'login' })
    return NextResponse.json(
      createAuthError(
        AUTH_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred'
      ),
      { status: 500 }
    )
  }
}
