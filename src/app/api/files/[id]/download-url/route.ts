import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  handleError,
  HTTP_STATUS,
} from '@/lib/api-response'
import { ERROR_CODES, FILE_LIMITS } from '@/lib/constants'
import prisma from '@/lib/prisma'
import { getDownloadUrl } from '@/lib/storage'
import { logger } from '@/lib/logger'

/**
 * FILE-006: Generate presigned download URL for a file
 *
 * GET /api/files/[id]/download-url
 *
 * Response:
 * {
 *   downloadUrl: string
 *   expiresAt: string (ISO timestamp)
 * }
 */

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    // 1. Authentication
    const user = await requireAuth()

    // 2. Get file ID from params
    const params = await context.params
    const fileId = params.id

    // 3. Get file and validate ownership
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

    // 4. Check if file is ready for download
    if (file.status === 'UPLOADING') {
      return errorResponse(
        ERROR_CODES.FILE_NOT_FOUND,
        'File is still uploading',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    if (file.status === 'FAILED') {
      return errorResponse(
        ERROR_CODES.FILE_NOT_FOUND,
        'File processing failed',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 5. Generate presigned download URL
    const { url: downloadUrl, error: storageError } = await getDownloadUrl(
      file.storagePath,
      FILE_LIMITS.DOWNLOAD_URL_EXPIRY
    )

    if (storageError || !downloadUrl) {
      logger.error('Failed to generate download URL', {
        fileId,
        storagePath: file.storagePath,
        error: storageError,
      })

      return errorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to generate download URL',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
    }

    // 6. Return download URL
    const expiresAt = new Date(
      Date.now() + FILE_LIMITS.DOWNLOAD_URL_EXPIRY * 1000
    )

    return successResponse(
      {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in download-url route', error)
    return handleError(error)
  }
}
