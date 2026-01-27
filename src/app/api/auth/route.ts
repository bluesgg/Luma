import type { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
  handleError,
} from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/auth - Check current authentication status
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return errorResponse(
        ERROR_CODES.AUTH_UNAUTHORIZED,
        'Not authenticated',
        HTTP_STATUS.UNAUTHORIZED
      )
    }

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailConfirmedAt: user.emailConfirmedAt,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
