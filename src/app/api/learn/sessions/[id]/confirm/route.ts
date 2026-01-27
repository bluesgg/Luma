/**
 * POST /api/learn/sessions/:id/confirm
 * Confirm understanding of current subtopic
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

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const params = await context.params
    const sessionId = params.id

    // Get session
    const session = await prisma.learningSession.findUnique({
      where: { id: sessionId },
      include: {
        file: {
          include: {
            topicGroups: {
              include: {
                subTopics: true,
              },
              orderBy: {
                index: 'asc',
              },
            },
          },
        },
      },
    })

    if (!session) {
      return errorResponse(
        ERROR_CODES.TUTOR_SESSION_NOT_FOUND,
        'Learning session not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    if (session.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.TUTOR_SESSION_FORBIDDEN,
        'You do not have permission to access this session',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // Get current topic and subtopic
    const currentTopic = session.file.topicGroups[session.currentTopicIndex]
    const currentSubTopic = currentTopic?.subTopics[session.currentSubIndex]

    if (!currentSubTopic) {
      return errorResponse(
        ERROR_CODES.NOT_FOUND,
        'Current subtopic not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // Mark subtopic as confirmed
    await prisma.subTopicProgress.upsert({
      where: {
        sessionId_subTopicId: {
          sessionId: session.id,
          subTopicId: currentSubTopic.id,
        },
      },
      create: {
        sessionId: session.id,
        subTopicId: currentSubTopic.id,
        confirmed: true,
        confirmedAt: new Date(),
      },
      update: {
        confirmed: true,
        confirmedAt: new Date(),
      },
    })

    // Determine next action
    const hasNextSub =
      session.currentSubIndex < currentTopic.subTopics.length - 1

    let nextAction: 'NEXT_SUB' | 'START_TEST' | 'NEXT_TOPIC' | 'COMPLETE'
    let nextSubTopic = null

    if (hasNextSub) {
      // Move to next subtopic
      await prisma.learningSession.update({
        where: { id: session.id },
        data: {
          currentSubIndex: session.currentSubIndex + 1,
          currentPhase: 'EXPLAINING',
        },
      })
      const nextSubTopicData =
        currentTopic.subTopics[session.currentSubIndex + 1]
      if (!nextSubTopicData) {
        return errorResponse(
          ERROR_CODES.TOPIC_NOT_FOUND,
          'Next subtopic not found',
          HTTP_STATUS.NOT_FOUND
        )
      }
      nextAction = 'NEXT_SUB'
      nextSubTopic = {
        id: nextSubTopicData.id,
        title: nextSubTopicData.title,
      }
    } else {
      // All subtopics confirmed, start test
      await prisma.learningSession.update({
        where: { id: session.id },
        data: {
          currentPhase: 'TESTING',
        },
      })
      nextAction = 'START_TEST'
    }

    logger.info('Subtopic confirmed', {
      sessionId: session.id,
      subTopicId: currentSubTopic.id,
      nextAction,
    })

    return successResponse({
      confirmed: true,
      nextAction,
      nextSubTopic,
    })
  } catch (error) {
    return handleError(error)
  }
}
