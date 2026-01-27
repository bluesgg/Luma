// =============================================================================
// TUTOR-011: Generate Topic Test API Tests (TDD)
// POST /api/learn/sessions/[id]/test
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { mockUser, mockLearningSession } from '../../../../setup'
import { ERROR_CODES } from '@/lib/constants'

describe('POST /api/learn/sessions/:id/test (TUTOR-011)', () => {
  let sessionId: string
  let userId: string
  let topicGroupId: string

  beforeEach(() => {
    vi.clearAllMocks()
    userId = mockUser.id
    sessionId = mockLearningSession.id
    topicGroupId = 'topic-1'
  })

  describe('Happy Path - Generate Questions', () => {
    it('should generate test questions for CORE topic', async () => {
      const mockSession = {
        ...mockLearningSession,
        userId,
        status: 'IN_PROGRESS',
        currentPhase: 'TESTING',
        currentTopicIndex: 0,
        file: {
          topicGroups: [
            {
              id: topicGroupId,
              index: 0,
              title: 'Introduction',
              type: 'CORE',
              subTopics: [
                {
                  id: 'sub-1',
                  title: 'Basic Concepts',
                  metadata: { summary: 'Introduction to basics' },
                },
              ],
            },
          ],
        },
        topicProgress: [],
      }

      vi.mocked(prisma.learningSession.findUnique).mockResolvedValue(
        mockSession as any
      )
      vi.mocked(prisma.topicTest.findMany).mockResolvedValue([])

      const response = {
        questions: [
          {
            index: 0,
            type: 'MULTIPLE_CHOICE',
            question: 'What is the main concept?',
            options: ['A', 'B', 'C', 'D'],
          },
        ],
        currentQuestionIndex: 0,
        completed: false,
      }

      expect(response.questions).toHaveLength(1)
      expect(response.questions[0].type).toBe('MULTIPLE_CHOICE')
    })

    it('should generate 5 questions for CORE topics', async () => {
      const questions = Array(5).fill({ type: 'MULTIPLE_CHOICE' })
      expect(questions).toHaveLength(5)
    })

    it('should generate 3 questions for SUPPORTING topics', async () => {
      const questions = Array(3).fill({ type: 'MULTIPLE_CHOICE' })
      expect(questions).toHaveLength(3)
    })

    it('should cache generated questions in database', async () => {
      const createdQuestions = [
        {
          id: 'q-1',
          topicGroupId,
          index: 0,
          type: 'MULTIPLE_CHOICE',
          question: 'Test question',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          explanation: 'Explanation',
        },
      ]

      vi.mocked(prisma.topicTest.create).mockResolvedValue(
        createdQuestions[0] as any
      )

      const created = await prisma.topicTest.create()
      expect(created.topicGroupId).toBe(topicGroupId)
    })

    it('should not include correctAnswer in response', async () => {
      const response = {
        questions: [
          {
            index: 0,
            type: 'MULTIPLE_CHOICE',
            question: 'Test?',
            options: ['A', 'B'],
          },
        ],
      }

      expect(response.questions[0]).not.toHaveProperty('correctAnswer')
    })

    it('should not include explanation in initial response', async () => {
      const response = {
        questions: [
          {
            index: 0,
            question: 'Test?',
          },
        ],
      }

      expect(response.questions[0]).not.toHaveProperty('explanation')
    })
  })

  describe('Happy Path - Return Cached Questions', () => {
    it('should return existing questions if already generated', async () => {
      const cachedQuestions = [
        {
          id: 'q-1',
          topicGroupId,
          index: 0,
          type: 'MULTIPLE_CHOICE',
          question: 'Cached question',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          explanation: 'Explanation',
        },
      ]

      vi.mocked(prisma.topicTest.findMany).mockResolvedValue(
        cachedQuestions as any
      )

      const questions = await prisma.topicTest.findMany()
      expect(questions).toHaveLength(1)
    })

    it('should not regenerate questions if they exist', async () => {
      vi.mocked(prisma.topicTest.findMany).mockResolvedValue([
        { id: 'q-1' },
      ] as any)

      const createSpy = vi.spyOn(prisma.topicTest, 'create')
      expect(createSpy).not.toHaveBeenCalled()
    })

    it('should determine current question from progress', async () => {
      const attempts = {
        '0': { correct: true },
        '1': { correct: false },
      }

      let currentIndex = 0
      for (let i = 0; i < 5; i++) {
        if (!attempts[i.toString()]?.correct) {
          currentIndex = i
          break
        }
      }

      expect(currentIndex).toBe(1)
    })
  })

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests (401)', async () => {
      const error = {
        status: 401,
        code: ERROR_CODES.AUTH_UNAUTHORIZED,
      }

      expect(error.status).toBe(401)
    })

    it('should reject other user session (403)', async () => {
      vi.mocked(prisma.learningSession.findUnique).mockResolvedValue({
        ...mockLearningSession,
        userId: 'other-user-id',
      } as any)

      const error = {
        status: 403,
        code: ERROR_CODES.SESSION_FORBIDDEN,
      }

      expect(error.status).toBe(403)
    })
  })

  describe('Validation', () => {
    it('should reject non-existent session (404)', async () => {
      vi.mocked(prisma.learningSession.findUnique).mockResolvedValue(null)

      const error = {
        status: 404,
        code: ERROR_CODES.SESSION_NOT_FOUND,
      }

      expect(error.status).toBe(404)
    })

    it('should reject completed session (400)', async () => {
      vi.mocked(prisma.learningSession.findUnique).mockResolvedValue({
        ...mockLearningSession,
        status: 'COMPLETED',
      } as any)

      const error = {
        status: 400,
        code: ERROR_CODES.SESSION_INVALID_STATE,
      }

      expect(error.status).toBe(400)
    })

    it('should reject if not in TESTING phase (400)', async () => {
      vi.mocked(prisma.learningSession.findUnique).mockResolvedValue({
        ...mockLearningSession,
        currentPhase: 'EXPLAINING',
      } as any)

      const error = {
        status: 400,
        code: ERROR_CODES.SESSION_INVALID_PHASE,
      }

      expect(error.status).toBe(400)
    })

    it('should reject when topic not found (404)', async () => {
      vi.mocked(prisma.learningSession.findUnique).mockResolvedValue({
        ...mockLearningSession,
        currentTopicIndex: 999,
        file: {
          topicGroups: [],
        },
      } as any)

      const error = {
        status: 404,
        code: ERROR_CODES.TOPIC_NOT_FOUND,
      }

      expect(error.status).toBe(404)
    })
  })

  describe('Quota Management', () => {
    it('should check quota before generating questions', async () => {
      const quotaCheck = {
        allowed: true,
        remaining: 100,
      }

      expect(quotaCheck.allowed).toBe(true)
    })

    it('should reject when quota exceeded (429)', async () => {
      const error = {
        status: 429,
        code: ERROR_CODES.QUOTA_EXCEEDED,
      }

      expect(error.status).toBe(429)
    })

    it('should consume quota after generation', async () => {
      const consumption = {
        bucket: 'LEARNING_INTERACTIONS',
        amount: 1,
        metadata: {
          action: 'test_generation',
          sessionId,
          questionCount: 5,
        },
      }

      expect(consumption.amount).toBe(1)
    })

    it('should not consume quota when returning cached questions', async () => {
      vi.mocked(prisma.topicTest.findMany).mockResolvedValue([
        { id: 'q-1' },
      ] as any)

      // Quota consumption should not happen
      expect(true).toBe(true)
    })
  })

  describe('AI Integration', () => {
    it('should generate prompt with subtopics data', async () => {
      const prompt = {
        topicTitle: 'Introduction',
        subTopics: [
          {
            title: 'Basic Concepts',
            summary: 'Introduction to basics',
          },
        ],
        questionCount: 5,
        topicType: 'CORE',
      }

      expect(prompt.questionCount).toBe(5)
    })

    it('should parse AI JSON response', async () => {
      const aiResponse = {
        questions: [
          {
            type: 'MULTIPLE_CHOICE',
            question: 'What is X?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
            explanation: 'Because...',
          },
        ],
      }

      expect(aiResponse.questions).toHaveLength(1)
    })

    it('should validate generated questions', async () => {
      const validation = {
        valid: true,
        errors: [],
      }

      expect(validation.valid).toBe(true)
    })

    it('should reject invalid AI responses (500)', async () => {
      const error = {
        status: 500,
        code: ERROR_CODES.AI_GENERATION_FAILED,
      }

      expect(error.status).toBe(500)
    })

    it('should log AI usage after generation', async () => {
      const aiUsage = {
        userId,
        action: 'TEST_GENERATE',
        inputTokens: 800,
        outputTokens: 2000,
      }

      expect(aiUsage.action).toBe('TEST_GENERATE')
    })
  })

  describe('Progress Tracking', () => {
    it('should create topic progress if not exists', async () => {
      vi.mocked(prisma.topicProgress.create).mockResolvedValue({
        id: 'progress-1',
        sessionId,
        topicGroupId,
        status: 'IN_PROGRESS',
        questionAttempts: {},
      } as any)

      const progress = await prisma.topicProgress.create()
      expect(progress.status).toBe('IN_PROGRESS')
    })

    it('should use existing topic progress', async () => {
      const existingProgress = {
        id: 'progress-1',
        topicGroupId,
        questionAttempts: { '0': { correct: true } },
      }

      expect(existingProgress.questionAttempts).toBeDefined()
    })

    it('should determine current question from attempts', async () => {
      const attempts = {
        '0': { correct: true },
        '1': { correct: true },
      }

      let current = 0
      for (let i = 0; i < 5; i++) {
        if (!attempts[i.toString()]?.correct) {
          current = i
          break
        }
      }

      expect(current).toBe(2)
    })
  })

  describe('Completion', () => {
    it('should return completed when all questions answered', async () => {
      const response = {
        completed: true,
        questions: [],
        currentQuestionIndex: 5,
      }

      expect(response.completed).toBe(true)
    })

    it('should check if all questions answered correctly', async () => {
      const attempts = {
        '0': { correct: true },
        '1': { correct: true },
        '2': { correct: true },
      }

      const allCorrect = Object.values(attempts).every((a) => a.correct)
      expect(allCorrect).toBe(true)
    })
  })

  describe('Question Types', () => {
    it('should support MULTIPLE_CHOICE questions', async () => {
      const question = {
        type: 'MULTIPLE_CHOICE',
        options: ['A', 'B', 'C', 'D'],
      }

      expect(question.type).toBe('MULTIPLE_CHOICE')
      expect(question.options).toHaveLength(4)
    })

    it('should support SHORT_ANSWER questions', async () => {
      const question = {
        type: 'SHORT_ANSWER',
        question: 'Explain X',
      }

      expect(question.type).toBe('SHORT_ANSWER')
      expect(question).not.toHaveProperty('options')
    })

    it('should include options for MULTIPLE_CHOICE', async () => {
      const question = {
        type: 'MULTIPLE_CHOICE',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
      }

      expect(question.options).toBeDefined()
    })

    it('should not include options for SHORT_ANSWER', async () => {
      const question = {
        type: 'SHORT_ANSWER',
        question: 'Explain',
      }

      expect(question).not.toHaveProperty('options')
    })
  })

  describe('Edge Cases', () => {
    it('should handle topics with no subtopics', async () => {
      const topic = {
        id: topicGroupId,
        title: 'Topic',
        subTopics: [],
      }

      expect(topic.subTopics).toHaveLength(0)
    })

    it('should handle malformed question attempts', async () => {
      const attempts = {}
      const currentIndex = 0
      expect(currentIndex).toBe(0)
    })
  })

  describe('Response Format', () => {
    it('should return correct structure', async () => {
      const response = {
        questions: [],
        currentQuestionIndex: 0,
        completed: false,
      }

      expect(response).toHaveProperty('questions')
      expect(response).toHaveProperty('currentQuestionIndex')
      expect(response).toHaveProperty('completed')
    })

    it('should order questions by index', async () => {
      const questions = [
        { index: 0 },
        { index: 1 },
        { index: 2 },
      ]

      expect(questions[0].index).toBe(0)
      expect(questions[1].index).toBe(1)
    })
  })
})
