import type { NextRequest } from 'next/server'
import { confirmResetPasswordSchema } from '@/lib/validation'
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
  handleError,
} from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import { hashPassword } from '@/lib/password'
import { validateToken, markTokenAsUsed } from '@/lib/token'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = confirmResetPasswordSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const { token, password } = validation.data

    // Validate token
    const tokenValidation = await validateToken(token)

    if (!tokenValidation.isValid || !tokenValidation.token) {
      return errorResponse(
        ERROR_CODES.AUTH_TOKEN_INVALID,
        'Invalid or expired reset token',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Check that token is for password reset
    if (tokenValidation.token.type !== 'PASSWORD_RESET') {
      return errorResponse(
        ERROR_CODES.AUTH_TOKEN_INVALID,
        'Invalid token type',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Hash new password
    const passwordHash = await hashPassword(password)

    // Update user password and reset account lock
    const user = await prisma.user.update({
      where: { id: tokenValidation.token.userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        email: true,
      },
    })

    // Mark token as used
    await markTokenAsUsed(tokenValidation.token.id)

    logger.info('Password reset successfully', { userId: user.id })

    return successResponse({
      message:
        'Password reset successful. Please log in with your new password.',
    })
  } catch (error) {
    return handleError(error)
  }
}
