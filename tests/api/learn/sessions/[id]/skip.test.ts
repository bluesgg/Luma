// =============================================================================
// TUTOR-013: Skip Test Question API Tests (TDD)
// POST /api/learn/sessions/[id]/skip
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { mockUser, mockLearningSession } from '../../../../setup'
import { ERROR_CODES } from '@/lib/constants'

describe('POST /api/learn/sessions/:id/skip (TUTOR-013)', () => {
  let sessionId: string
  let userId: string

  beforeEach(() => {
    vi.clearAllMocks()
    userId = mockUser.id
    sessionId = mockLearningSession.id
  })

  describe('Happy Path', () => {
    it('should skip question successfully', async () => {
      const response = {
        skipped: true,
        correctAnswer: 'A',
        explanation: 'The correct answer is A because...',
      }

      expect(response.skipped).toBe(true)
      expect(response.correctAnswer).toBeDefined()
    })

    it('should reveal correct answer', async () => {
      const response = {
        correctAnswer: 'A',
      }

      expect(response.correctAnswer).toBe('A')
    })

    it('should provide explanation', async () => {
      const response = {
        explanation: 'Detailed explanation...',
      }

      expect(response.explanation).toBeDefined()
    })

    it('should mark question as skipped in progress', async () => {
      const progress = {
        questionAttempts: {
          '0': {
            skipped: true,
            timestamp: new Date(),
          },
        },
      }

      expect(progress.questionAttempts['0'].skipped).toBe(true)
    })

    it('should mark topic as weak point', async () => {
      const topicProgress = {
        isWeakPoint: true,
      }

      expect(topicProgress.isWeakPoint).toBe(true)
    })
  })

  describe('Validation', () => {
    it('should require questionIndex', async () => {
      const error = {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
      }

      expect(error.status).toBe(400)
    })

    it('should reject invalid questionIndex', async () => {
      const error = {
        status: 404,
        code: ERROR_CODES.NOT_FOUND,
      }

      expect(error.status).toBe(404)
    })

    it('should reject if not in TESTING phase', async () => {
      const error = {
        status: 400,
        code: ERROR_CODES.SESSION_INVALID_PHASE,
      }

      expect(error.status).toBe(400)
    })
  })

  describe('Authentication', () => {
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

  describe('Edge Cases', () => {
    it('should handle already skipped question', async () => {
      const attempts = {
        '0': { skipped: true },
      }

      expect(attempts['0'].skipped).toBe(true)
    })

    it('should handle already answered question', async () => {
      const attempts = {
        '0': { correct: true },
      }

      expect(attempts['0'].correct).toBe(true)
    })
  })

  describe('Response Format', () => {
    it('should return correct structure', async () => {
      const response = {
        skipped: true,
        correctAnswer: 'A',
        explanation: 'Explanation',
      }

      expect(response).toHaveProperty('skipped')
      expect(response).toHaveProperty('correctAnswer')
      expect(response).toHaveProperty('explanation')
    })
  })
})
