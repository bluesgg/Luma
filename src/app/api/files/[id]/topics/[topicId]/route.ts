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

/**
 * TUTOR-027: Topic Type Manual Adjustment
 *
 * PATCH /api/files/[id]/topics/[topicId]
 *
 * Allows manual adjustment of topic type (CORE/SUPPORTING).
 * Useful when AI extraction misclassifies topic importance.
 */

type RouteContext = {
  params: Promise<{
    id: string
    topicId: string
  }>
}

const updateTopicSchema = z.object({
  type: z.enum(['CORE', 'SUPPORTING']),
})

/**
 * PATCH /api/files/[id]/topics/[topicId]
 *
 * Request body:
 * {
 *   type: "CORE" | "SUPPORTING"
 * }
 *
 * Response:
 * {
 *   topic: {
 *     id: string
 *     title: string
 *     type: "CORE" | "SUPPORTING"
 *     updatedAt: string
 *   }
 * }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // 1. Authentication
    const user = await requireAuth()

    // 2. Get params
    const params = await context.params
    const fileId = params.id
    const topicId = params.topicId

    // 3. Parse and validate request body
    const body = await request.json()
    const validation = updateTopicSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request data',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const { type } = validation.data

    // 4. Get topic with file ownership check
    const topic = await prisma.topicGroup.findUnique({
      where: { id: topicId },
      include: {
        file: {
          include: {
            course: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    })

    if (!topic) {
      return errorResponse(
        ERROR_CODES.TOPIC_NOT_FOUND,
        'Topic not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // 5. Validate file ownership
    if (topic.file.course.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.FILE_FORBIDDEN,
        'You do not have permission to modify this topic',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 6. Validate file ID matches
    if (topic.fileId !== fileId) {
      return errorResponse(
        ERROR_CODES.TOPIC_NOT_FOUND,
        'Topic does not belong to this file',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // 7. Update topic type
    const updatedTopic = await prisma.topicGroup.update({
      where: { id: topicId },
      data: {
        type,
      },
    })

    logger.info('Topic type updated', {
      topicId,
      fileId,
      previousType: topic.type,
      newType: type,
    })

    // 8. Return updated topic
    return successResponse(
      {
        topic: {
          id: updatedTopic.id,
          title: updatedTopic.title,
          type: updatedTopic.type,
          index: updatedTopic.index,
          pageStart: updatedTopic.pageStart,
          pageEnd: updatedTopic.pageEnd,
        },
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in PATCH /api/files/[id]/topics/[topicId]', error)
    return handleError(error)
  }
}
