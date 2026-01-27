import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
  handleError,
} from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import { getQuotaStats } from '@/lib/quota'

/**
 * GET /api/quota
 * Get quota status for authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser()

    if (!user) {
      return errorResponse(
        ERROR_CODES.AUTH_UNAUTHORIZED,
        'You must be authenticated to access quota information',
        HTTP_STATUS.UNAUTHORIZED
      )
    }

    // Get quota statistics
    const stats = await getQuotaStats(user.id)

    // Calculate status color based on percentage
    const getStatusColor = (percentage: number): 'green' | 'yellow' | 'red' => {
      if (percentage < 70) return 'green'
      if (percentage <= 90) return 'yellow'
      return 'red'
    }

    // Format response with status colors
    const responseData = {
      learningInteractions: {
        ...stats.learningInteractions,
        status: getStatusColor(stats.learningInteractions.percentage),
      },
      autoExplain: {
        ...stats.autoExplain,
        status: getStatusColor(stats.autoExplain.percentage),
      },
    }

    return successResponse(responseData, HTTP_STATUS.OK)
  } catch (error) {
    return handleError(error)
  }
}
