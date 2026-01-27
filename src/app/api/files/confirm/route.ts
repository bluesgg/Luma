import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  handleError,
  HTTP_STATUS,
} from '@/lib/api-response'
import { ERROR_CODES, FILE_LIMITS } from '@/lib/constants'
import prisma from '@/lib/prisma'
import { fileExists } from '@/lib/storage'
import { analyzePdf } from '@/lib/pdf'
import { logger } from '@/lib/logger'
import { apiRateLimit } from '@/lib/rate-limit'
import { requireCsrfToken } from '@/lib/csrf-server'

/**
 * FILE-002: Confirm file upload completion
 *
 * POST /api/files/confirm
 *
 * Request body:
 * {
 *   fileId: string
 * }
 *
 * Response:
 * {
 *   file: {
 *     id: string
 *     name: string
 *     pageCount: number
 *     isScanned: boolean
 *     status: string
 *     structureStatus: string
 *     ...
 *   }
 * }
 */

const confirmUploadSchema = z.object({
  fileId: z.string().cuid('Invalid file ID'),
})

export async function POST(request: NextRequest) {
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

    // 4. Parse and validate request body
    const body = await request.json()
    const validation = confirmUploadSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request data',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const { fileId } = validation.data

    // 5. Get file record and validate ownership
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

    // 6. Check if file is in UPLOADING status
    if (file.status !== 'UPLOADING') {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'File is not in UPLOADING status',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 7. Verify file exists in storage
    const exists = await fileExists(file.storagePath)
    if (!exists) {
      logger.error('File not found in storage after upload', {
        fileId: file.id,
        storagePath: file.storagePath,
      })

      // Update file status to FAILED
      await prisma.file.update({
        where: { id: fileId },
        data: {
          status: 'FAILED',
        },
      })

      return errorResponse(
        ERROR_CODES.FILE_NOT_FOUND,
        'File not found in storage. Upload may have failed.',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 8. Analyze PDF to get metadata
    let pdfMetadata
    try {
      pdfMetadata = await analyzePdf(file.storagePath)
    } catch (error) {
      logger.error('Failed to analyze PDF', { fileId, error })

      // Update file status to FAILED in transaction to ensure consistency
      await prisma.file.update({
        where: { id: fileId },
        data: {
          status: 'FAILED',
        },
      })

      return errorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to analyze PDF file',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
    }

    // 9. Validate page count and update file in a transaction
    // This ensures atomic update and prevents partial state on errors
    let updatedFile
    try {
      updatedFile = await prisma.$transaction(async (tx) => {
        // Validate page count
        if (pdfMetadata.pageCount > FILE_LIMITS.MAX_PAGE_COUNT) {
          logger.error('PDF exceeds maximum page count', {
            fileId,
            pageCount: pdfMetadata.pageCount,
          })

          // Update file status to FAILED
          await tx.file.update({
            where: { id: fileId },
            data: {
              status: 'FAILED',
            },
          })

          throw new Error(
            `FILE_TOO_MANY_PAGES:PDF exceeds maximum page count of ${FILE_LIMITS.MAX_PAGE_COUNT} pages`
          )
        }

        // Update file record with metadata and status
        const updated = await tx.file.update({
          where: { id: fileId },
          data: {
            pageCount: pdfMetadata.pageCount,
            isScanned: pdfMetadata.isScanned,
            status: 'PROCESSING', // Will be set to READY after structure extraction
            updatedAt: new Date(),
          },
          include: {
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        return updated
      })
    } catch (error) {
      // Handle transaction errors
      if (error instanceof Error && error.message.includes(':')) {
        const parts = error.message.split(':', 2)
        const code = parts[0]
        const message = parts[1] || 'Unknown error'

        if (code === 'FILE_TOO_MANY_PAGES') {
          return errorResponse(
            ERROR_CODES.FILE_TOO_MANY_PAGES,
            message,
            HTTP_STATUS.BAD_REQUEST
          )
        }
      }

      logger.error('Error in confirm transaction', error)
      return handleError(error)
    }

    // 11. Return updated file record
    return successResponse(
      {
        file: {
          id: updatedFile.id,
          courseId: updatedFile.courseId,
          name: updatedFile.name,
          type: updatedFile.type,
          pageCount: updatedFile.pageCount,
          fileSize: updatedFile.fileSize.toString(), // Convert BigInt to string
          isScanned: updatedFile.isScanned,
          status: updatedFile.status,
          structureStatus: updatedFile.structureStatus,
          storagePath: updatedFile.storagePath,
          createdAt: updatedFile.createdAt.toISOString(),
          updatedAt: updatedFile.updatedAt.toISOString(),
          course: updatedFile.course,
        },
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in confirm route', error)
    return handleError(error)
  }
}
