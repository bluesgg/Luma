/**
 * GET /api/learn/sessions/:id
 * Get learning session details with progress
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
import type { LearningSessionOutline } from '@/types/database'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const params = await context.params
    const sessionId = params.id

    // Get session with all related data
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
        topicProgress: true,
        subTopicProgress: true,
      },
    })

    if (!session) {
      return errorResponse(
        ERROR_CODES.TUTOR_SESSION_NOT_FOUND,
        'Learning session not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // Check ownership
    if (session.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.TUTOR_SESSION_FORBIDDEN,
        'You do not have permission to access this session',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // Build outline with progress
    const outline: LearningSessionOutline[] = session.file.topicGroups.map(
      (group) => {
        const progress = session.topicProgress.find(
          (p) => p.topicGroupId === group.id
        )

        const subTopicProgress = group.subTopics.map((sub) => {
          const subProgress = session.subTopicProgress.find(
            (sp) => sp.subTopicId === sub.id
          )

          return {
            id: sub.id,
            index: sub.index,
            title: sub.title,
            confirmed: subProgress?.confirmed || false,
          }
        })

        return {
          id: group.id,
          index: group.index,
          title: group.title,
          type: group.type,
          status: progress?.status || 'PENDING',
          isWeakPoint: progress?.isWeakPoint || false,
          subTopics: subTopicProgress,
        }
      }
    )

    // Calculate progress
    const completedTopics = session.topicProgress.filter(
      (p) => p.status === 'COMPLETED'
    ).length
    const totalTopics = session.file.topicGroups.length

    return successResponse({
      session: {
        id: session.id,
        status: session.status,
        currentTopicIndex: session.currentTopicIndex,
        currentSubIndex: session.currentSubIndex,
        currentPhase: session.currentPhase,
        startedAt: session.startedAt,
        lastActiveAt: session.lastActiveAt,
        completedAt: session.completedAt,
      },
      file: {
        id: session.file.id,
        name: session.file.name,
        pageCount: session.file.pageCount,
      },
      outline,
      progress: {
        completed: completedTopics,
        total: totalTopics,
        percentage: Math.round((completedTopics / totalTopics) * 100),
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
