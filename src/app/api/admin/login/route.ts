import type { NextRequest } from 'next/server'
import { adminLoginSchema } from '@/lib/validation'
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
  handleError,
} from '@/lib/api-response'
import { ADMIN_ERROR_CODES } from '@/lib/constants'
import { verifyPassword } from '@/lib/password'
import { authRateLimit } from '@/lib/rate-limit'
import { setAdminSession, createAuditLog } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = adminLoginSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const { email: rawEmail, password } = validation.data
    const email = rawEmail.toLowerCase().trim()

    // Rate limiting by email
    const rateLimitResult = await authRateLimit(email)
    if (!rateLimitResult.allowed) {
      return errorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Too many login attempts. Please try again later.',
        HTTP_STATUS.TOO_MANY_REQUESTS
      )
    }

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email },
    })

    // Generic error message to prevent admin enumeration
    const invalidCredentialsError = errorResponse(
      ADMIN_ERROR_CODES.ADMIN_INVALID_CREDENTIALS,
      'Invalid email or password',
      HTTP_STATUS.UNAUTHORIZED
    )

    if (!admin) {
      return invalidCredentialsError
    }

    // Check if admin is disabled
    if (admin.disabledAt) {
      return errorResponse(
        ADMIN_ERROR_CODES.ADMIN_DISABLED,
        'This admin account has been disabled',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, admin.passwordHash)

    if (!isPasswordValid) {
      logger.warn('Failed admin login attempt', {
        adminId: admin.id,
        email,
      })

      return invalidCredentialsError
    }

    // Successful login - set session
    await setAdminSession(admin.id)

    // Create audit log entry
    await createAuditLog(admin.id, 'ADMIN_LOGIN', {
      email,
      timestamp: new Date().toISOString(),
    })

    logger.info('Admin logged in successfully', { adminId: admin.id, email })

    return successResponse({
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt,
      },
      message: 'Login successful',
    })
  } catch (error) {
    return handleError(error)
  }
}
