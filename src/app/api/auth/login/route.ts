import type { NextRequest } from 'next/server'
import { loginSchema } from '@/lib/validation'
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
  handleError,
} from '@/lib/api-response'
import { ERROR_CODES, SECURITY } from '@/lib/constants'
import { verifyPassword } from '@/lib/password'
import { authRateLimit } from '@/lib/rate-limit'
import { isAccountLocked } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = loginSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const { email: rawEmail, password, rememberMe } = validation.data
    const email = rawEmail.toLowerCase().trim()

    // Rate limiting by email
    const rateLimitResult = await authRateLimit(email)
    if (!rateLimitResult.allowed) {
      return errorResponse(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many login attempts. Please try again later.',
        HTTP_STATUS.TOO_MANY_REQUESTS
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Generic error message to prevent user enumeration
    const invalidCredentialsError = errorResponse(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      'Invalid email or password',
      HTTP_STATUS.UNAUTHORIZED
    )

    if (!user) {
      return invalidCredentialsError
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      return errorResponse(
        ERROR_CODES.AUTH_ACCOUNT_LOCKED,
        'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // Check if email is verified
    if (!user.emailConfirmedAt) {
      return errorResponse(
        ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED,
        'Please verify your email address before logging in',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash)

    if (!isPasswordValid) {
      // Increment failed login attempts
      const newFailedAttempts = user.failedLoginAttempts + 1
      const updateData: {
        failedLoginAttempts: number
        lockedUntil?: Date
      } = {
        failedLoginAttempts: newFailedAttempts,
      }

      // Lock account if max attempts reached
      if (newFailedAttempts >= SECURITY.MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(
          Date.now() + SECURITY.LOCKOUT_DURATION_MS
        )
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      })

      logger.warn('Failed login attempt', {
        userId: user.id,
        email,
        attempts: newFailedAttempts,
      })

      return invalidCredentialsError
    }

    // Successful login - reset failed attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    })

    // Calculate session maxAge
    const maxAge = rememberMe
      ? SECURITY.SESSION_MAX_AGE_REMEMBER_DAYS * 24 * 60 * 60
      : SECURITY.SESSION_MAX_AGE_DAYS * 24 * 60 * 60

    const response = successResponse({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailConfirmedAt: user.emailConfirmedAt,
      },
      message: 'Login successful',
    })

    // Set session cookie with user ID
    response.cookies.set(SECURITY.SESSION_COOKIE_NAME, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    logger.info('User logged in successfully', { userId: user.id, email })

    return response
  } catch (error) {
    return handleError(error)
  }
}
