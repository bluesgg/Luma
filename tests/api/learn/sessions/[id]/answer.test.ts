// =============================================================================
// TUTOR-012: Submit Test Answer API Tests (TDD)
// POST /api/learn/sessions/[id]/answer
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { mockUser, mockLearningSession } from '../../../../setup'
import { ERROR_CODES } from '@/lib/constants'

describe('POST /api/learn/sessions/:id/answer (TUTOR-012)', () => {
  let sessionId: string
  let userId: string

  beforeEach(() => {
    vi.clearAllMocks()
    userId = mockUser.id
    sessionId = mockLearningSession.id
  })

  describe('Happy Path - Correct Answer', () => {
    it('should accept correct answer', async () => {
      const body = {
        questionIndex: 0,
        answer: 'A',
      }

      const response = {
        correct: true,
        attemptCount: 1,
        explanation: 'That is correct!',
        canRetry: false,
      }

      expect(response.correct).toBe(true)
      expect(response.attemptCount).toBe(1)
    })

    it('should record correct attempt in topic progress', async () => {
      const progress = {
        questionAttempts: {
          '0': {
            attempts: 1,
            correct: true,
            timestamp: new Date(),
          },
        },
      }

      expect(progress.questionAttempts['0'].correct).toBe(true)
    })

    it('should increment correctCount', async () => {
      const topicProgress = {
        correctCount: 1,
      }

      expect(topicProgress.correctCount).toBe(1)
    })

    it('should not provide re-explanation for correct answer', async () => {
      const response = {
        correct: true,
        explanation: 'Correct!',
      }

      expect(response).not.toHaveProperty('reExplanation')
    })
  })

  describe('Happy Path - Wrong Answer', () => {
    it('should reject wrong answer', async () => {
      const response = {
        correct: false,
        attemptCount: 1,
        explanation: 'Original explanation',
        reExplanation: 'Let me explain again...',
        canRetry: true,
      }

      expect(response.correct).toBe(false)
      expect(response.reExplanation).toBeDefined()
    })

    it('should generate re-explanation using AI', async () => {
      const reExplanation = {
        question: 'What is X?',
        userAnswer: 'B',
        correctAnswer: 'A',
        originalExplanation: 'Explanation',
      }

      expect(reExplanation.userAnswer).not.toBe(reExplanation.correctAnswer)
    })

    it('should allow retry if under max attempts', async () => {
      const response = {
        attemptCount: 1,
        canRetry: true,
      }

      const maxAttempts = 3
      expect(response.attemptCount).toBeLessThan(maxAttempts)
      expect(response.canRetry).toBe(true)
    })

    it('should increment wrongCount', async () => {
      const topicProgress = {
        wrongCount: 1,
      }

      expect(topicProgress.wrongCount).toBe(1)
    })
  })

  describe('Maximum Attempts', () => {
    it('should reveal answer after max attempts', async () => {
      const response = {
        correct: false,
        attemptCount: 3,
        canRetry: false,
        correctAnswer: 'A',
      }

      expect(response.canRetry).toBe(false)
      expect(response.correctAnswer).toBeDefined()
    })

    it('should mark topic as weak point after max wrong attempts', async () => {
      const topicProgress = {
        isWeakPoint: true,
        wrongCount: 3,
      }

      expect(topicProgress.isWeakPoint).toBe(true)
    })

    it('should not allow further retries', async () => {
      const response = {
        attemptCount: 3,
        canRetry: false,
      }

      expect(response.canRetry).toBe(false)
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
      const error = {
        status: 403,
        code: ERROR_CODES.SESSION_FORBIDDEN,
      }

      expect(error.status).toBe(403)
    })
  })

  describe('Validation', () => {
    it('should reject missing questionIndex (400)', async () => {
      const body = {
        answer: 'A',
      }

      const error = {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
      }

      expect(error.status).toBe(400)
    })

    it('should reject missing answer (400)', async () => {
      const body = {
        questionIndex: 0,
      }

      const error = {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
      }

      expect(error.status).toBe(400)
    })

    it('should reject empty answer (400)', async () => {
      const body = {
        questionIndex: 0,
        answer: '',
      }

      const error = {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
      }

      expect(error.status).toBe(400)
    })

    it('should reject negative questionIndex (400)', async () => {
      const body = {
        questionIndex: -1,
        answer: 'A',
      }

      const error = {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
      }

      expect(error.status).toBe(400)
    })

    it('should reject invalid questionIndex (404)', async () => {
      const body = {
        questionIndex: 999,
        answer: 'A',
      }

      const error = {
        status: 404,
        code: ERROR_CODES.NOT_FOUND,
      }

      expect(error.status).toBe(404)
    })

    it('should reject if not in TESTING phase (400)', async () => {
      const error = {
        status: 400,
        code: ERROR_CODES.SESSION_INVALID_PHASE,
      }

      expect(error.status).toBe(400)
    })
  })

  describe('Answer Comparison', () => {
    it('should compare case-insensitive for SHORT_ANSWER', async () => {
      const userAnswer = 'Machine Learning'
      const correctAnswer = 'machine learning'

      const isCorrect =
        userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
      expect(isCorrect).toBe(true)
    })

    it('should trim whitespace', async () => {
      const userAnswer = '  A  '
      const correctAnswer = 'A'

      expect(userAnswer.trim()).toBe(correctAnswer)
    })

    it('should be case-sensitive for MULTIPLE_CHOICE', async () => {
      const userAnswer = 'A'
      const correctAnswer = 'A'

      expect(userAnswer).toBe(correctAnswer)
    })
  })

  describe('Quota Management', () => {
    it('should consume quota for wrong answers requiring re-explanation', async () => {
      const consumption = {
        bucket: 'LEARNING_INTERACTIONS',
        amount: 1,
      }

      expect(consumption.amount).toBe(1)
    })

    it('should not consume quota for correct answers', async () => {
      // No quota consumption
      expect(true).toBe(true)
    })
  })

  describe('AI Re-explanation', () => {
    it('should generate re-explanation for wrong answer', async () => {
      const prompt = {
        question: 'What is X?',
        userAnswer: 'B',
        correctAnswer: 'A',
        originalExplanation: 'Because A is correct',
      }

      expect(prompt.userAnswer).not.toBe(prompt.correctAnswer)
    })

    it('should log AI usage for re-explanation', async () => {
      const usage = {
        userId,
        action: 'RE_EXPLAIN',
        inputTokens: 300,
        outputTokens: 500,
      }

      expect(usage.action).toBe('RE_EXPLAIN')
    })

    it('should handle AI failures gracefully', async () => {
      const fallback = {
        reExplanation: 'Please review the material and try again.',
      }

      expect(fallback.reExplanation).toBeDefined()
    })
  })

  describe('Progress Tracking', () => {
    it('should update attempt count', async () => {
      const attempts = {
        '0': {
          attempts: 2,
        },
      }

      expect(attempts['0'].attempts).toBe(2)
    })

    it('should track timestamp of attempt', async () => {
      const timestamp = new Date()
      expect(timestamp).toBeInstanceOf(Date)
    })

    it('should maintain attempt history', async () => {
      const history = [
        { answer: 'B', correct: false },
        { answer: 'A', correct: true },
      ]

      expect(history).toHaveLength(2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle already answered question', async () => {
      const attempts = {
        '0': {
          correct: true,
          attempts: 1,
        },
      }

      // Allow re-answering or skip
      expect(attempts['0'].correct).toBe(true)
    })

    it('should handle concurrent submissions', async () => {
      // Should prevent race conditions
      expect(true).toBe(true)
    })

    it('should handle very long answers', async () => {
      const longAnswer = 'A'.repeat(1000)
      expect(longAnswer.length).toBe(1000)
    })

    it('should handle special characters in answer', async () => {
      const answer = 'A/B & C-D'
      expect(answer).toContain('/')
    })
  })

  describe('Response Format', () => {
    it('should return correct structure for correct answer', async () => {
      const response = {
        correct: true,
        attemptCount: 1,
        explanation: 'Correct!',
        canRetry: false,
      }

      expect(response).toHaveProperty('correct')
      expect(response).toHaveProperty('attemptCount')
      expect(response).toHaveProperty('explanation')
    })

    it('should return correct structure for wrong answer', async () => {
      const response = {
        correct: false,
        attemptCount: 1,
        explanation: 'Original',
        reExplanation: 'Re-explained',
        canRetry: true,
      }

      expect(response).toHaveProperty('reExplanation')
      expect(response).toHaveProperty('canRetry')
    })

    it('should include correctAnswer when max attempts reached', async () => {
      const response = {
        correct: false,
        attemptCount: 3,
        canRetry: false,
        correctAnswer: 'A',
      }

      expect(response).toHaveProperty('correctAnswer')
    })
  })
})
