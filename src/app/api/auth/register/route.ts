import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  isValidEmail,
  isValidPassword,
  createAuthError,
  createAuthSuccess,
  createUserProfile,
} from '@/lib/auth'
import { AUTH_ERROR_CODES, type RegisterRequest } from '@/types'
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
    const rateLimitResult = authRateLimiter(getRateLimitKey(ip, undefined, 'register'))
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.RATE_LIMITED, 'Too many registration attempts. Please try again later'),
        { status: 429 }
      )
    }

    let body: RegisterRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'Invalid request body'),
        { status: 400 }
      )
    }
    const { email, password } = body

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

    const supabase = await createClient()

    // Attempt to sign up with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getValidatedRedirectUrl(
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          '/login?verified=true'
        ),
      },
    })

    if (error) {
      // Handle specific Supabase errors
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          createAuthError(
            AUTH_ERROR_CODES.EMAIL_EXISTS,
            'An account with this email already exists'
          ),
          { status: 409 }
        )
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          createAuthError(
            AUTH_ERROR_CODES.RATE_LIMITED,
            'Too many requests. Please try again later'
          ),
          { status: 429 }
        )
      }

      logger.error('Supabase signup error', error, { action: 'register' })
      return NextResponse.json(
        createAuthError(
          AUTH_ERROR_CODES.INTERNAL_ERROR,
          'Registration failed. Please try again'
        ),
        { status: 500 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        createAuthError(
          AUTH_ERROR_CODES.INTERNAL_ERROR,
          'Registration failed. Please try again'
        ),
        { status: 500 }
      )
    }

    // Create profile and quota records
    try {
      await createUserProfile(data.user.id)
    } catch (profileError) {
      logger.error('Failed to create user profile', profileError, { action: 'register' })
      // Return error - user should retry registration
      return NextResponse.json(
        createAuthError(
          AUTH_ERROR_CODES.INTERNAL_ERROR,
          'Registration failed. Please try again'
        ),
        { status: 500 }
      )
    }

    return NextResponse.json(
      createAuthSuccess({
        message:
          'Registration successful. Please check your email to verify your account.',
        user: {
          id: data.user.id,
          email: data.user.email ?? '',
          emailConfirmedAt: data.user.email_confirmed_at ?? null,
          createdAt: data.user.created_at,
        },
      }),
      { status: 201 }
    )
  } catch (error) {
    logger.error('Registration error', error, { action: 'register' })
    return NextResponse.json(
      createAuthError(
        AUTH_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred'
      ),
      { status: 500 }
    )
  }
}
