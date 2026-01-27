/**
 * POST /api/files/:id/learn/start
 * Start or resume a learning session for a file
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
import type {
  LearningSessionOutline,
  StartSessionResponse,
} from '@/types/database'

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

    // Get file with topic structure
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        course: true,
        topicGroups: {
          include: {
            subTopics: true,
          },
          orderBy: {
            index: 'asc',
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

    // Check ownership
    if (file.course.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.FILE_FORBIDDEN,
        'You do not have permission to access this file',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // Check if structure is ready
    if (file.structureStatus !== 'READY') {
      if (
        file.structureStatus === 'PENDING' ||
        file.structureStatus === 'PROCESSING'
      ) {
        return errorResponse(
          ERROR_CODES.TUTOR_STRUCTURE_NOT_READY,
          'Knowledge structure extraction is still in progress. Please try again later.',
          HTTP_STATUS.BAD_REQUEST
        )
      } else {
        return errorResponse(
          ERROR_CODES.TUTOR_STRUCTURE_FAILED,
          'Knowledge structure extraction failed. Please retry extraction.',
          HTTP_STATUS.BAD_REQUEST
        )
      }
    }

    // Check if topic groups exist
    if (file.topicGroups.length === 0) {
      return errorResponse(
        ERROR_CODES.TUTOR_STRUCTURE_NOT_READY,
        'No topic structure available for this file',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Check for existing session
    let session = await prisma.learningSession.findUnique({
      where: {
        userId_fileId: {
          userId: user.id,
          fileId: file.id,
        },
      },
      include: {
        topicProgress: true,
        subTopicProgress: true,
      },
    })

    const isNew = !session

    if (!session) {
      // Create new session
      session = await prisma.learningSession.create({
        data: {
          userId: user.id,
          fileId: file.id,
          status: 'IN_PROGRESS',
          currentTopicIndex: 0,
          currentSubIndex: 0,
          currentPhase: 'EXPLAINING',
        },
        include: {
          topicProgress: true,
          subTopicProgress: true,
        },
      })

      // Initialize topic progress for all topic groups
      await prisma.topicProgress.createMany({
        data: file.topicGroups.map((group) => ({
          sessionId: session!.id,
          topicGroupId: group.id,
          status: 'PENDING',
        })),
      })

      // Reload session with progress
      session = await prisma.learningSession.findUnique({
        where: { id: session!.id },
        include: {
          topicProgress: true,
          subTopicProgress: true,
        },
      })

      if (!session) {
        return errorResponse(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'Failed to create learning session',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        )
      }

      logger.info('New learning session created', {
        sessionId: session.id,
        fileId: file.id,
        userId: user.id,
      })
    } else {
      // Resume existing session - update lastActiveAt
      session = await prisma.learningSession.update({
        where: { id: session.id },
        data: {
          status: 'IN_PROGRESS',
        },
        include: {
          topicProgress: true,
          subTopicProgress: true,
        },
      })

      logger.info('Learning session resumed', {
        sessionId: session.id,
        fileId: file.id,
        userId: user.id,
      })
    }

    // Build outline with progress
    const outline: LearningSessionOutline[] = file.topicGroups.map((group) => {
      const progress = session!.topicProgress.find(
        (p) => p.topicGroupId === group.id
      )

      const subTopicProgress = group.subTopics.map((sub) => {
        const subProgress = session!.subTopicProgress.find(
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
    })

    // Calculate overall progress
    const completedTopics = session.topicProgress.filter(
      (p) => p.status === 'COMPLETED'
    ).length
    const totalTopics = file.topicGroups.length

    const response: StartSessionResponse = {
      sessionId: session.id,
      isNew,
      file: {
        id: file.id,
        name: file.name,
        pageCount: file.pageCount,
      },
      outline,
      currentTopicIndex: session.currentTopicIndex,
      currentSubIndex: session.currentSubIndex,
      currentPhase: session.currentPhase,
      progress: {
        completed: completedTopics,
        total: totalTopics,
      },
    }

    return successResponse(response)
  } catch (error) {
    return handleError(error)
  }
}
