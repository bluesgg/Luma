import type { NextRequest } from 'next/server'
import { resetPasswordSchema } from '@/lib/validation'
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
  handleError,
} from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import { generateVerificationToken, invalidateUserTokens } from '@/lib/token'
import { sendPasswordResetEmail } from '@/lib/email'
import { emailRateLimit } from '@/lib/rate-limit'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = resetPasswordSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const { email: rawEmail } = validation.data
    const email = rawEmail.toLowerCase().trim()

    // Rate limiting by email
    const rateLimitResult = await emailRateLimit(email)
    if (!rateLimitResult.allowed) {
      return errorResponse(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many password reset requests. Please try again later.',
        HTTP_STATUS.TOO_MANY_REQUESTS
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Don't reveal if user exists or not (security)
    // Always return success message
    if (!user) {
      return successResponse({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      })
    }

    // Invalidate any existing password reset tokens
    await invalidateUserTokens(user.id, 'PASSWORD_RESET')

    // Generate password reset token
    const { token } = await generateVerificationToken(user.id, 'PASSWORD_RESET')

    // Send password reset email
    await sendPasswordResetEmail(email, token)

    logger.info('Password reset email sent', { userId: user.id, email })

    return successResponse({
      message:
        'If an account with that email exists, a password reset link has been sent.',
    })
  } catch (error) {
    return handleError(error)
  }
}
