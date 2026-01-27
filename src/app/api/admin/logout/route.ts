import type { NextRequest } from 'next/server'
import { successResponse, HTTP_STATUS, handleError } from '@/lib/api-response'
import {
  requireAdmin,
  clearAdminSession,
  createAuditLog,
} from '@/lib/admin-auth'
import { logger } from '@/lib/logger'

export async function POST(_request: NextRequest) {
  try {
    // Require admin authentication
    const admin = await requireAdmin()

    // Create audit log entry
    await createAuditLog(admin.id, 'ADMIN_LOGOUT', {
      timestamp: new Date().toISOString(),
    })

    // Clear session cookie
    await clearAdminSession()

    logger.info('Admin logged out successfully', { adminId: admin.id })

    return successResponse(
      {
        message: 'Logout successful',
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    return handleError(error)
  }
}
