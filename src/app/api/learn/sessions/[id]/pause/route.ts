import type { NextRequest } from 'next/server'
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
 * TUTOR-015: Pause Learning Session API
 *
 * POST /api/learn/sessions/[id]/pause
 *
 * Pauses an active learning session.
 * Session can be resumed later from the same position.
 */

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/learn/sessions/[id]/pause
 *
 * Response:
 * {
 *   paused: boolean
 *   session: {
 *     id: string
 *     status: "PAUSED"
 *     currentTopicIndex: number
 *     currentSubIndex: number
 *     currentPhase: string
 *   }
 * }
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    // 1. Authentication
    const user = await requireAuth()

    // 2. Get session ID from params
    const params = await context.params
    const sessionId = params.id

    // 3. Get learning session
    const session = await prisma.learningSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      return errorResponse(
        ERROR_CODES.SESSION_NOT_FOUND,
        'Learning session not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // 4. Validate ownership
    if (session.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.SESSION_FORBIDDEN,
        'You do not have permission to access this session',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 5. Validate session status
    if (session.status !== 'IN_PROGRESS') {
      return errorResponse(
        ERROR_CODES.SESSION_INVALID_STATE,
        'Only active sessions can be paused',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 6. Pause session
    const updatedSession = await prisma.learningSession.update({
      where: { id: sessionId },
      data: {
        status: 'PAUSED',
      },
    })

    logger.info('Learning session paused', {
      sessionId,
      currentTopicIndex: updatedSession.currentTopicIndex,
      currentSubIndex: updatedSession.currentSubIndex,
      currentPhase: updatedSession.currentPhase,
    })

    // 7. Return paused session info
    return successResponse(
      {
        paused: true,
        session: {
          id: updatedSession.id,
          status: updatedSession.status,
          currentTopicIndex: updatedSession.currentTopicIndex,
          currentSubIndex: updatedSession.currentSubIndex,
          currentPhase: updatedSession.currentPhase,
        },
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in POST /api/learn/sessions/[id]/pause', error)
    return handleError(error)
  }
}
