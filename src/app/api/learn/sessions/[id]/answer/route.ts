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
import { consumeQuota } from '@/lib/quota'
import { callAI, logAIUsage } from '@/lib/ai'
import { generateReExplanationPrompt } from '@/lib/ai/prompts/explanation'

/**
 * TUTOR-012: Submit Test Answer API
 *
 * POST /api/learn/sessions/[id]/answer
 *
 * Submits an answer to a test question and returns feedback.
 * If wrong, generates re-explanation using AI.
 */

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const submitAnswerSchema = z.object({
  questionIndex: z.number().int().min(0),
  answer: z.string().min(1, 'Answer is required'),
})

/**
 * POST /api/learn/sessions/[id]/answer
 *
 * Request body:
 * {
 *   questionIndex: number
 *   answer: string
 * }
 *
 * Response:
 * {
 *   correct: boolean
 *   attemptCount: number
 *   explanation: string
 *   reExplanation?: string (if wrong)
 *   canRetry: boolean
 *   correctAnswer?: string (if max attempts reached)
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
    const validation = submitAnswerSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request data',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const { questionIndex, answer } = validation.data

    // 4. Get learning session with topic progress
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
        topicProgress: {
          include: {
            topicGroup: true,
          },
        },
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

    // 7. Get current topic group and test question
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

    // 8. Get or create topic progress
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
        include: {
          topicGroup: true,
        },
      })
    }

    // 9. Check answer correctness
    // Normalize whitespace and compare case-insensitively for flexible matching
    const normalizeAnswer = (ans: string) => {
      return ans.trim().toLowerCase().replace(/\s+/g, ' ')
    }

    const userAnswer = normalizeAnswer(answer)
    const correctAnswer = normalizeAnswer(testQuestion.correctAnswer)
    const isCorrect = userAnswer === correctAnswer

    // 10. Update question attempts
    const attempts =
      (topicProgress.questionAttempts as Record<string, any>) || {}
    const questionKey = questionIndex.toString()
    const currentAttempts = attempts[questionKey] || {
      count: 0,
      correct: false,
      answers: [],
    }

    currentAttempts.count += 1
    currentAttempts.answers.push({
      answer,
      correct: isCorrect,
      timestamp: new Date().toISOString(),
    })

    if (isCorrect) {
      currentAttempts.correct = true
    }

    attempts[questionKey] = currentAttempts

    // 11. Update progress statistics
    const totalAttempts = topicProgress.totalAttempts + 1
    const correctCount = isCorrect
      ? topicProgress.correctCount + 1
      : topicProgress.correctCount
    const wrongCount = !isCorrect
      ? topicProgress.wrongCount + 1
      : topicProgress.wrongCount

    // 12. Update topic progress in database
    await prisma.topicProgress.update({
      where: { id: topicProgress.id },
      data: {
        questionAttempts: attempts,
        totalAttempts,
        correctCount,
        wrongCount,
      },
    })

    // 13. Generate re-explanation if answer is wrong
    let reExplanation: string | undefined
    const MAX_ATTEMPTS = 3

    if (!isCorrect && currentAttempts.count < MAX_ATTEMPTS) {
      // Generate re-explanation using AI
      const subTopicTitle =
        currentTopicGroup.subTopics[0]?.title || currentTopicGroup.title
      const prompt = generateReExplanationPrompt(
        subTopicTitle,
        testQuestion.question,
        answer,
        testQuestion.correctAnswer,
        currentAttempts.count
      )

      try {
        const aiResponse = await callAI({
          systemPrompt:
            'You are an expert tutor helping students understand their mistakes.',
          userPrompt: prompt,
          temperature: 0.7,
          maxTokens: 500,
        })

        reExplanation = aiResponse.content

        // Consume quota for re-explanation
        await consumeQuota(user.id, 'LEARNING_INTERACTIONS', 1, {
          action: 're_explanation',
          sessionId,
          questionIndex,
          attemptCount: currentAttempts.count,
        })

        // Log AI usage
        await logAIUsage(
          user.id,
          'EXPLAIN',
          aiResponse.inputTokens,
          aiResponse.outputTokens,
          {
            sessionId,
            questionIndex,
            attemptCount: currentAttempts.count,
          }
        )
      } catch (error) {
        logger.error('Failed to generate re-explanation', error)
        // Continue without re-explanation
      }
    }

    // 14. Prepare response
    const canRetry = !isCorrect && currentAttempts.count < MAX_ATTEMPTS

    return successResponse(
      {
        correct: isCorrect,
        attemptCount: currentAttempts.count,
        explanation: testQuestion.explanation,
        reExplanation,
        canRetry,
        correctAnswer:
          currentAttempts.count >= MAX_ATTEMPTS
            ? testQuestion.correctAnswer
            : undefined,
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in POST /api/learn/sessions/[id]/answer', error)
    return handleError(error)
  }
}
