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
import { checkQuota, consumeQuota } from '@/lib/quota'
import { callAI, parseAIJSON, logAIUsage } from '@/lib/ai'
import {
  TEST_GENERATION_SYSTEM_PROMPT,
  generateTestQuestionsPrompt,
  validateTestQuestions,
} from '@/lib/ai/prompts/explanation'

/**
 * TUTOR-011: Generate Topic Test API
 *
 * POST /api/learn/sessions/[id]/test
 *
 * Generates test questions for the current topic, or retrieves cached questions.
 * Only generates new questions if none exist in database.
 */

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/learn/sessions/[id]/test
 *
 * Response:
 * {
 *   questions: [
 *     {
 *       index: number
 *       type: "MULTIPLE_CHOICE" | "SHORT_ANSWER"
 *       question: string
 *       options?: string[]
 *       correctAnswer: string (not included in response)
 *       explanation: string (not included initially)
 *     }
 *   ],
 *   currentQuestionIndex: number
 * }
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    // 1. Authentication
    const user = await requireAuth()

    // 2. Get session ID from params
    const params = await context.params
    const sessionId = params.id

    // 3. Get learning session with current topic progress
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

    // 6. Validate session phase
    if (session.currentPhase !== 'TESTING') {
      return errorResponse(
        ERROR_CODES.SESSION_INVALID_PHASE,
        'Session is not in testing phase. Must confirm understanding first.',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 7. Get current topic group
    const currentTopicGroup =
      session.file.topicGroups[session.currentTopicIndex]
    if (!currentTopicGroup) {
      return errorResponse(
        ERROR_CODES.TOPIC_NOT_FOUND,
        'Current topic not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // 8. Check if test questions already exist
    let testQuestions = await prisma.topicTest.findMany({
      where: { topicGroupId: currentTopicGroup.id },
      orderBy: { index: 'asc' },
    })

    // 9. Generate questions if they don't exist
    if (testQuestions.length === 0) {
      // Check quota before generation
      const quotaCheck = await checkQuota(user.id, 'LEARNING_INTERACTIONS', 1)
      if (!quotaCheck.allowed) {
        return errorResponse(
          ERROR_CODES.QUOTA_EXCEEDED,
          'You have exceeded your monthly learning interactions quota',
          HTTP_STATUS.TOO_MANY_REQUESTS
        )
      }

      // Determine question count based on topic type
      const questionCount = currentTopicGroup.type === 'CORE' ? 5 : 3

      // Prepare subtopics data
      const subTopicsData = currentTopicGroup.subTopics.map((st) => ({
        title: st.title,
        summary: (st.metadata as any).summary || '',
      }))

      // Generate test questions using AI
      const prompt = generateTestQuestionsPrompt(
        currentTopicGroup.title,
        subTopicsData,
        questionCount,
        currentTopicGroup.type
      )

      logger.info('Generating test questions', {
        sessionId,
        topicGroupId: currentTopicGroup.id,
        questionCount,
      })

      const aiResponse = await callAI({
        systemPrompt: TEST_GENERATION_SYSTEM_PROMPT,
        userPrompt: prompt,
        temperature: 0.7,
        maxTokens: 2000,
      })

      // Parse and validate AI response
      let questionsData
      try {
        questionsData = parseAIJSON(aiResponse.content)
      } catch {
        logger.error('Failed to parse AI test questions response')
        return errorResponse(
          ERROR_CODES.AI_GENERATION_FAILED,
          'Failed to generate test questions. Please try again.',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        )
      }

      const validation = validateTestQuestions(questionsData)
      if (!validation.valid) {
        logger.error('Invalid test questions from AI', {
          errors: validation.errors,
        })
        return errorResponse(
          ERROR_CODES.AI_GENERATION_FAILED,
          'Generated questions are invalid. Please try again.',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        )
      }

      // Save questions to database
      const createdQuestions = await Promise.all(
        questionsData.questions.map((q: any, index: number) =>
          prisma.topicTest.create({
            data: {
              topicGroupId: currentTopicGroup.id,
              index,
              type: q.type,
              question: q.question,
              options: q.options || null,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
            },
          })
        )
      )

      testQuestions = createdQuestions

      // Consume quota
      await consumeQuota(user.id, 'LEARNING_INTERACTIONS', 1, {
        action: 'test_generation',
        sessionId,
        topicGroupId: currentTopicGroup.id,
        questionCount: createdQuestions.length,
      })

      // Log AI usage
      await logAIUsage(
        user.id,
        'TEST_GENERATE',
        aiResponse.inputTokens,
        aiResponse.outputTokens,
        {
          sessionId,
          topicGroupId: currentTopicGroup.id,
          questionCount: createdQuestions.length,
        }
      )

      logger.info('Test questions generated and cached', {
        sessionId,
        topicGroupId: currentTopicGroup.id,
        questionCount: createdQuestions.length,
      })
    }

    // 10. Get or create topic progress
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

    // 11. Get current question index from progress
    const attempts =
      (topicProgress.questionAttempts as Record<string, any>) || {}
    let currentQuestionIndex = 0

    // Find first unanswered or incorrectly answered question
    for (let i = 0; i < testQuestions.length; i++) {
      const questionAttempts = attempts[i.toString()]
      if (!questionAttempts || !questionAttempts.correct) {
        currentQuestionIndex = i
        break
      }
    }

    // If all questions answered correctly, return completed
    if (currentQuestionIndex >= testQuestions.length) {
      return successResponse(
        {
          completed: true,
          questions: [],
          currentQuestionIndex: testQuestions.length,
        },
        HTTP_STATUS.OK
      )
    }

    // 12. Return questions without correct answers
    const questionsResponse = testQuestions.map((q) => ({
      index: q.index,
      type: q.type,
      question: q.question,
      options: q.options as string[] | null,
      // Don't include correctAnswer or explanation yet
    }))

    return successResponse(
      {
        questions: questionsResponse,
        currentQuestionIndex,
        completed: false,
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in POST /api/learn/sessions/[id]/test', error)
    return handleError(error)
  }
}
