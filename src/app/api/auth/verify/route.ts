import type { NextRequest } from 'next/server'
import { errorResponse, HTTP_STATUS } from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import { validateToken, markTokenAsUsed } from '@/lib/token'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Verification token is required',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Validate token
    const validation = await validateToken(token)

    if (!validation.isValid || !validation.token) {
      return errorResponse(
        ERROR_CODES.AUTH_TOKEN_INVALID,
        'Invalid or expired verification token',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Check that token is for email verification
    if (validation.token.type !== 'EMAIL_VERIFY') {
      return errorResponse(
        ERROR_CODES.AUTH_TOKEN_INVALID,
        'Invalid token type',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Update user's email confirmation
    const user = await prisma.user.update({
      where: { id: validation.token.userId },
      data: { emailConfirmedAt: new Date() },
      select: {
        id: true,
        email: true,
        emailConfirmedAt: true,
      },
    })

    // Mark token as used
    await markTokenAsUsed(validation.token.id)

    logger.info('Email verified successfully', { userId: user.id })

    // Redirect to login page with success message
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/login?verified=true',
      },
    })
  } catch (error) {
    logger.error('Email verification error', error)
    // Redirect to login with error
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/login?verified=false',
      },
    })
  }
}
