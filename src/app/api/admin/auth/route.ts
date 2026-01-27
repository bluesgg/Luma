import type { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
  handleError,
} from '@/lib/api-response'
import { ADMIN_ERROR_CODES } from '@/lib/constants'
import { getAdminSession } from '@/lib/admin-auth'

export async function GET(_request: NextRequest) {
  try {
    const admin = await getAdminSession()

    if (!admin) {
      return errorResponse(
        ADMIN_ERROR_CODES.ADMIN_UNAUTHORIZED,
        'Not authenticated',
        HTTP_STATUS.UNAUTHORIZED
      )
    }

    if (admin.disabledAt) {
      return errorResponse(
        ADMIN_ERROR_CODES.ADMIN_DISABLED,
        'Admin account is disabled',
        HTTP_STATUS.FORBIDDEN
      )
    }

    return successResponse({
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
