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
import { deleteFile as deleteStorageFile } from '@/lib/storage'
import { logger } from '@/lib/logger'
import { apiRateLimit } from '@/lib/rate-limit'
import { requireCsrfToken } from '@/lib/csrf-server'

/**
 * FILE-004: Get file details
 * FILE-005: Delete file
 *
 * GET /api/files/[id] - Get single file with all metadata
 * PATCH /api/files/[id] - Update file metadata
 * DELETE /api/files/[id] - Delete file
 */

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/files/[id]
 *
 * Response:
 * {
 *   file: {
 *     id: string
 *     courseId: string
 *     name: string
 *     type: string
 *     pageCount: number | null
 *     fileSize: string
 *     isScanned: boolean
 *     status: string
 *     structureStatus: string
 *     structureError: string | null
 *     createdAt: string
 *     updatedAt: string
 *     extractedAt: string | null
 *     course: { id: string, name: string }
 *   }
 * }
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    // 1. Authentication
    const user = await requireAuth()

    // 2. Get file ID from params
    const params = await context.params
    const fileId = params.id

    // 3. Get file record with course info
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        course: {
          select: {
            id: true,
            name: true,
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

    // 4. Validate ownership
    if (file.course.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.FILE_FORBIDDEN,
        'You do not have permission to access this file',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 5. Return file details
    return successResponse(
      {
        file: {
          id: file.id,
          courseId: file.courseId,
          name: file.name,
          type: file.type,
          pageCount: file.pageCount,
          fileSize: file.fileSize.toString(),
          isScanned: file.isScanned,
          status: file.status,
          structureStatus: file.structureStatus,
          structureError: file.structureError,
          storagePath: file.storagePath,
          createdAt: file.createdAt.toISOString(),
          updatedAt: file.updatedAt.toISOString(),
          extractedAt: file.extractedAt?.toISOString() || null,
          course: {
            id: file.course.id,
            name: file.course.name,
          },
        },
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in GET /api/files/[id]', error)
    return handleError(error)
  }
}

/**
 * PATCH /api/files/[id]
 *
 * Request body:
 * {
 *   name?: string
 *   type?: string
 * }
 *
 * Response:
 * {
 *   file: { ... }
 * }
 */
const updateFileSchema = z.object({
  name: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name too long')
    .optional(),
  type: z.enum(['LECTURE', 'HOMEWORK', 'EXAM', 'OTHER']).optional(),
})

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // 1. Authentication
    const user = await requireAuth()

    // 2. Get file ID from params
    const params = await context.params
    const fileId = params.id

    // 3. Parse and validate request body
    const body = await request.json()
    const validation = updateFileSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request data',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const updateData = validation.data

    // 5. Get file and validate ownership
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
        'You do not have permission to update this file',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 5. Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== file.name) {
      const existingFile = await prisma.file.findUnique({
        where: {
          courseId_name: {
            courseId: file.courseId,
            name: updateData.name,
          },
        },
      })

      if (existingFile) {
        return errorResponse(
          ERROR_CODES.FILE_DUPLICATE_NAME,
          'A file with this name already exists in the course',
          HTTP_STATUS.CONFLICT
        )
      }
    }

    // 6. Update file record
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: updateData,
      include: {
        course: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // 7. Return updated file
    return successResponse(
      {
        file: {
          id: updatedFile.id,
          courseId: updatedFile.courseId,
          name: updatedFile.name,
          type: updatedFile.type,
          pageCount: updatedFile.pageCount,
          fileSize: updatedFile.fileSize.toString(),
          isScanned: updatedFile.isScanned,
          status: updatedFile.status,
          structureStatus: updatedFile.structureStatus,
          structureError: updatedFile.structureError,
          storagePath: updatedFile.storagePath,
          createdAt: updatedFile.createdAt.toISOString(),
          updatedAt: updatedFile.updatedAt.toISOString(),
          extractedAt: updatedFile.extractedAt?.toISOString() || null,
          course: updatedFile.course,
        },
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in PATCH /api/files/[id]', error)
    return handleError(error)
  }
}

/**
 * DELETE /api/files/[id]
 *
 * Response:
 * {
 *   message: string
 * }
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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

    // 5. Get file and validate ownership
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
        'You do not have permission to delete this file',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 6. Delete file from storage
    const { error: storageError } = await deleteStorageFile(file.storagePath)
    if (storageError) {
      logger.error('Failed to delete file from storage', {
        fileId,
        storagePath: file.storagePath,
        error: storageError,
      })
      // Continue with database deletion even if storage deletion fails
    }

    // 7. Delete file record from database (cascade will delete related data)
    await prisma.file.delete({
      where: { id: fileId },
    })

    return successResponse(
      {
        message: 'File deleted successfully',
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in DELETE /api/files/[id]', error)
    return handleError(error)
  }
}
