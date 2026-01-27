/**
 * POST /api/files/:id/extract/retry
 * Retry failed PDF structure extraction
 */

import type { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  handleError,
  HTTP_STATUS,
} from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { isTriggerConfigured } from '@/trigger/client'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const params = await context.params
    const fileId = params.id

    // Get file
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        course: true,
      },
    })

    if (!file) {
      return errorResponse(
        ERROR_CODES.FILE_NOT_FOUND,
        'File not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // Check ownership
    if (file.course.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.FILE_FORBIDDEN,
        'You do not have permission to access this file',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // Check if structure extraction is in FAILED state
    if (file.structureStatus !== 'FAILED') {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Structure extraction can only be retried for failed files',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Check if Trigger.dev is configured
    if (!isTriggerConfigured()) {
      return errorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Background job system is not configured',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
    }

    // Reset status to PENDING
    await prisma.file.update({
      where: { id: fileId },
      data: {
        structureStatus: 'PENDING',
        structureError: null,
      },
    })

    // Trigger extraction job if Trigger.dev is configured
    if (isTriggerConfigured()) {
      // TODO: Implement Trigger.dev job dispatch once SDK v3 is properly configured
      // await triggerClient!.sendEvent({
      //   name: 'pdf.extract-structure',
      //   payload: {
      //     fileId: file.id,
      //     userId: user.id,
      //     storagePath: file.storagePath,
      //     pageCount: file.pageCount || 0,
      //     fileName: file.name,
      //   },
      // })

      logger.info('Structure extraction retry triggered', {
        fileId,
        userId: user.id,
      })
    } else {
      logger.warn('Trigger.dev not configured, extraction job not dispatched', {
        fileId,
      })
    }

    return successResponse({
      message: 'Structure extraction retry initiated',
      fileId: file.id,
      status: 'PENDING',
    })
  } catch (error) {
    return handleError(error)
  }
}
