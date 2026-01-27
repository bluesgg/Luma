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
 * TUTOR-014: Advance to Next Topic API
 *
 * POST /api/learn/sessions/[id]/next
 *
 * Advances to the next topic after completing the current topic's test.
 * Marks current topic as completed or skipped (if weak point).
 */

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/learn/sessions/[id]/next
 *
 * Response:
 * {
 *   nextTopicIndex: number
 *   nextSubTopicIndex: number
 *   phase: "EXPLAINING" | "COMPLETED"
 *   completed: boolean
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
      include: {
        file: {
          include: {
            topicGroups: {
              include: {
                subTopics: true,
              },
              orderBy: { index: 'asc' },
            },
          },
        },
        topicProgress: true,
      },
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
        'Session is not in progress',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 6. Get current topic
    const currentTopicGroup =
      session.file.topicGroups[session.currentTopicIndex]
    if (!currentTopicGroup) {
      return errorResponse(
        ERROR_CODES.TOPIC_NOT_FOUND,
        'Current topic not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // 7. Get topic progress
    const topicProgress = session.topicProgress.find(
      (tp) => tp.topicGroupId === currentTopicGroup.id
    )

    if (!topicProgress) {
      return errorResponse(
        ERROR_CODES.PROGRESS_NOT_FOUND,
        'Topic progress not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // 8. Calculate topic performance
    const attempts =
      (topicProgress.questionAttempts as Record<string, any>) || {}
    const totalQuestions = Object.keys(attempts).length
    const correctQuestions = Object.values(attempts).filter(
      (a: any) => a.correct
    ).length

    // Mark as weak point if < 60% correct
    const isWeakPoint =
      totalQuestions > 0 && correctQuestions / totalQuestions < 0.6

    // 9. Mark current topic as completed
    await prisma.topicProgress.update({
      where: { id: topicProgress.id },
      data: {
        status: 'COMPLETED',
        isWeakPoint,
        completedAt: new Date(),
      },
    })

    // 10. Determine next topic
    const nextTopicIndex = session.currentTopicIndex + 1
    const hasMoreTopics = nextTopicIndex < session.file.topicGroups.length

    if (!hasMoreTopics) {
      // All topics completed - mark session as completed
      await prisma.learningSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })

      logger.info('Learning session completed', { sessionId })

      return successResponse(
        {
          nextTopicIndex,
          nextSubTopicIndex: 0,
          phase: 'COMPLETED',
          completed: true,
        },
        HTTP_STATUS.OK
      )
    }

    // 11. Advance to next topic
    const nextTopic = session.file.topicGroups[nextTopicIndex]

    if (!nextTopic) {
      return errorResponse(
        ERROR_CODES.TOPIC_NOT_FOUND,
        'Next topic not found',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
    }

    await prisma.learningSession.update({
      where: { id: sessionId },
      data: {
        currentTopicIndex: nextTopicIndex,
        currentSubIndex: 0,
        currentPhase: 'EXPLAINING',
      },
    })

    logger.info('Advanced to next topic', {
      sessionId,
      nextTopicIndex,
      nextTopicId: nextTopic.id,
    })

    // 12. Return next topic info
    return successResponse(
      {
        nextTopicIndex,
        nextSubTopicIndex: 0,
        phase: 'EXPLAINING',
        completed: false,
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in POST /api/learn/sessions/[id]/next', error)
    return handleError(error)
  }
}
