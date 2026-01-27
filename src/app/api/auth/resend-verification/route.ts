import type { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
  handleError,
} from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import { generateVerificationToken, invalidateUserTokens } from '@/lib/token'
import { sendVerificationEmail } from '@/lib/email'
import { emailRateLimit } from '@/lib/rate-limit'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

const resendSchema = z.object({
  email: z.string().email('Invalid email format'),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = resendSchema.safeParse(body)

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
        'Too many verification email requests. Please try again later.',
        HTTP_STATUS.TOO_MANY_REQUESTS
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Don't reveal if user exists or not (security)
    if (!user) {
      return successResponse({
        message: 'If an account exists, a verification email has been sent.',
      })
    }

    // Check if already verified
    if (user.emailConfirmedAt) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Email is already verified',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Invalidate old verification tokens
    await invalidateUserTokens(user.id, 'EMAIL_VERIFY')

    // Generate new verification token
    const { token } = await generateVerificationToken(user.id, 'EMAIL_VERIFY')

    // Send verification email
    await sendVerificationEmail(email, token)

    logger.info('Verification email resent', { userId: user.id, email })

    return successResponse({
      message: 'Verification email has been sent. Please check your inbox.',
    })
  } catch (error) {
    return handleError(error)
  }
}
