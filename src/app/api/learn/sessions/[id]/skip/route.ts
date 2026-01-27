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
 * TUTOR-013: Skip Test Question API
 *
 * POST /api/learn/sessions/[id]/skip
 *
 * Allows skipping a question after 3 failed attempts.
 * Marks the question as skipped and reveals the correct answer.
 */

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const skipQuestionSchema = z.object({
  questionIndex: z.number().int().min(0),
})

/**
 * POST /api/learn/sessions/[id]/skip
 *
 * Request body:
 * {
 *   questionIndex: number
 * }
 *
 * Response:
 * {
 *   skipped: boolean
 *   correctAnswer: string
 *   explanation: string
 * }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // 1. Authentication
    const user = await requireAuth()

    // 2. Get session ID from params
    const params = await context.params
    const sessionId = params.id

    // 3. Parse and validate request body
    const body = await request.json()
    const validation = skipQuestionSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request data',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const { questionIndex } = validation.data

    // 4. Get learning session
    const session = await prisma.learningSession.findUnique({
      where: { id: sessionId },
      include: {
        file: {
          include: {
            topicGroups: {
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

    // 5. Validate ownership
    if (session.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.SESSION_FORBIDDEN,
        'You do not have permission to access this session',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 6. Validate session status and phase
    if (session.status !== 'IN_PROGRESS') {
      return errorResponse(
        ERROR_CODES.SESSION_INVALID_STATE,
        'Session is not in progress',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    if (session.currentPhase !== 'TESTING') {
      return errorResponse(
        ERROR_CODES.SESSION_INVALID_PHASE,
        'Session is not in testing phase',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 7. Get current topic and test question
    const currentTopicGroup =
      session.file.topicGroups[session.currentTopicIndex]
    if (!currentTopicGroup) {
      return errorResponse(
        ERROR_CODES.TOPIC_NOT_FOUND,
        'Current topic not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    const testQuestion = await prisma.topicTest.findFirst({
      where: {
        topicGroupId: currentTopicGroup.id,
        index: questionIndex,
      },
    })

    if (!testQuestion) {
      return errorResponse(
        ERROR_CODES.QUESTION_NOT_FOUND,
        'Test question not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // 8. Get topic progress
    let topicProgress = session.topicProgress.find(
      (tp) => tp.topicGroupId === currentTopicGroup.id
    )

    if (!topicProgress) {
      topicProgress = await prisma.topicProgress.create({
        data: {
          sessionId: session.id,
          topicGroupId: currentTopicGroup.id,
          status: 'IN_PROGRESS',
          questionAttempts: {},
        },
      })
    }

    // 9. Check if question can be skipped (must have 3 failed attempts)
    const attempts =
      (topicProgress.questionAttempts as Record<string, any>) || {}
    const questionKey = questionIndex.toString()
    const currentAttempts = attempts[questionKey] || {
      count: 0,
      correct: false,
      answers: [],
    }

    const MAX_ATTEMPTS = 3

    if (currentAttempts.correct) {
      return errorResponse(
        ERROR_CODES.QUESTION_ALREADY_CORRECT,
        'Question has already been answered correctly',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    if (currentAttempts.count < MAX_ATTEMPTS) {
      return errorResponse(
        ERROR_CODES.SKIP_NOT_ALLOWED,
        `You must attempt the question ${MAX_ATTEMPTS} times before skipping`,
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 10. Mark question as skipped
    currentAttempts.skipped = true
    attempts[questionKey] = currentAttempts

    // 11. Update topic progress
    await prisma.topicProgress.update({
      where: { id: topicProgress.id },
      data: {
        questionAttempts: attempts,
      },
    })

    logger.info('Question skipped', {
      sessionId,
      questionIndex,
      attemptCount: currentAttempts.count,
    })

    // 12. Return correct answer and explanation
    return successResponse(
      {
        skipped: true,
        correctAnswer: testQuestion.correctAnswer,
        explanation: testQuestion.explanation,
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in POST /api/learn/sessions/[id]/skip', error)
    return handleError(error)
  }
}
