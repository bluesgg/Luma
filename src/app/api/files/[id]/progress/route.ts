import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  handleError,
  HTTP_STATUS,
} from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { apiRateLimit } from '@/lib/rate-limit'
import { requireCsrfToken } from '@/lib/csrf-server'

/**
 * READER-003: Reading Progress API
 * GET /api/files/[id]/progress - Get current reading progress
 * PATCH /api/files/[id]/progress - Update current page
 */

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/files/[id]/progress
 *
 * Response:
 * {
 *   currentPage: number
 *   updatedAt: string
 * }
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    // 1. Authentication
    const user = await requireAuth()

    // 2. Get file ID from params
    const params = await context.params
    const fileId = params.id

    // 3. Validate file exists and user owns it
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        course: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!file) {
      return errorResponse(
        ERROR_CODES.FILE_NOT_FOUND,
        'File not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    if (file.course.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.FILE_FORBIDDEN,
        'You do not have permission to access this file',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 4. Get reading progress
    const progress = await prisma.readingProgress.findUnique({
      where: {
        userId_fileId: {
          userId: user.id,
          fileId,
        },
      },
    })

    // 5. Return progress (default to page 1 if no progress exists)
    return successResponse(
      {
        currentPage: progress?.currentPage || 1,
        updatedAt:
          progress?.updatedAt.toISOString() || new Date().toISOString(),
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in GET /api/files/[id]/progress', error)
    return handleError(error)
  }
}

/**
 * PATCH /api/files/[id]/progress
 *
 * Request body:
 * {
 *   currentPage: number
 * }
 *
 * Response:
 * {
 *   currentPage: number
 *   updatedAt: string
 * }
 */
const updateProgressSchema = z.object({
  currentPage: z.number().int().min(1).max(10000), // Sanity check - actual validation against file.pageCount below
})

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // 1. CSRF protection
    try {
      await requireCsrfToken(request)
    } catch {
      return errorResponse(
        ERROR_CODES.CSRF_TOKEN_INVALID,
        'Invalid CSRF token',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 2. Authentication
    const user = await requireAuth()

    // 3. Rate limiting
    const rateLimit = await apiRateLimit(user.id)
    if (!rateLimit.allowed) {
      return errorResponse(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many requests. Please try again later.',
        HTTP_STATUS.TOO_MANY_REQUESTS
      )
    }

    // 4. Get file ID from params
    const params = await context.params
    const fileId = params.id

    // 5. Parse and validate request body
    const body = await request.json()
    const validation = updateProgressSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request data',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const { currentPage } = validation.data

    // 6. Validate file exists and user owns it
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        course: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!file) {
      return errorResponse(
        ERROR_CODES.FILE_NOT_FOUND,
        'File not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    if (file.course.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.FILE_FORBIDDEN,
        'You do not have permission to update progress for this file',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 7. Validate currentPage against actual page count
    if (file.pageCount && currentPage > file.pageCount) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        `Page ${currentPage} exceeds document page count of ${file.pageCount}`,
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 8. Upsert reading progress
    const progress = await prisma.readingProgress.upsert({
      where: {
        userId_fileId: {
          userId: user.id,
          fileId,
        },
      },
      update: {
        currentPage,
      },
      create: {
        userId: user.id,
        fileId,
        currentPage,
      },
    })

    // 9. Return updated progress
    return successResponse(
      {
        currentPage: progress.currentPage,
        updatedAt: progress.updatedAt.toISOString(),
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in PATCH /api/files/[id]/progress', error)
    return handleError(error)
  }
}
