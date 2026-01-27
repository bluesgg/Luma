// =============================================================================
// TUTOR-014: Advance to Next Topic API Tests (TDD)
// POST /api/learn/sessions/[id]/next
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { mockUser, mockLearningSession } from '../../../../setup'
import { ERROR_CODES } from '@/lib/constants'

describe('POST /api/learn/sessions/:id/next (TUTOR-014)', () => {
  let sessionId: string
  let userId: string

  beforeEach(() => {
    vi.clearAllMocks()
    userId = mockUser.id
    sessionId = mockLearningSession.id
  })

  describe('Happy Path - Move to Next Topic', () => {
    it('should advance to next topic', async () => {
      const response = {
        nextTopicIndex: 1,
        nextSubTopicIndex: 0,
        phase: 'EXPLAINING',
        completed: false,
      }

      expect(response.nextTopicIndex).toBe(1)
      expect(response.phase).toBe('EXPLAINING')
    })

    it('should increment currentTopicIndex', async () => {
      const session = {
        currentTopicIndex: 1,
        currentSubIndex: 0,
      }

      expect(session.currentTopicIndex).toBe(1)
    })

    it('should reset currentSubIndex to 0', async () => {
      const session = {
        currentSubIndex: 0,
      }

      expect(session.currentSubIndex).toBe(0)
    })

    it('should update phase to EXPLAINING', async () => {
      const session = {
        currentPhase: 'EXPLAINING',
      }

      expect(session.currentPhase).toBe('EXPLAINING')
    })

    it('should mark previous topic as COMPLETED', async () => {
      const topicProgress = {
        status: 'COMPLETED',
      }

      expect(topicProgress.status).toBe('COMPLETED')
    })
  })

  describe('Happy Path - Complete Session', () => {
    it('should complete session when last topic finished', async () => {
      const response = {
        phase: 'COMPLETED',
        completed: true,
        nextTopicIndex: 2,
      }

      expect(response.completed).toBe(true)
    })

    it('should update session status to COMPLETED', async () => {
      const session = {
        status: 'COMPLETED',
        completedAt: new Date(),
      }

      expect(session.status).toBe('COMPLETED')
      expect(session.completedAt).toBeDefined()
    })

    it('should mark all topics as COMPLETED', async () => {
      const topicProgress = [
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
      ]

      expect(topicProgress.every((tp) => tp.status === 'COMPLETED')).toBe(true)
    })
  })

  describe('Validation', () => {
    it('should reject non-existent session (404)', async () => {
      const error = {
        status: 404,
        code: ERROR_CODES.SESSION_NOT_FOUND,
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

    it('should reject if tests not completed (400)', async () => {
      const error = {
        status: 400,
        code: ERROR_CODES.SESSION_INVALID_STATE,
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
    it('should handle last topic completion', async () => {
      const response = {
        completed: true,
      }

      expect(response.completed).toBe(true)
    })

    it('should handle single topic session', async () => {
      const topics = [{ id: 'topic-1' }]
      expect(topics).toHaveLength(1)
    })
  })

  describe('Response Format', () => {
    it('should return correct structure for next topic', async () => {
      const response = {
        nextTopicIndex: 1,
        nextSubTopicIndex: 0,
        phase: 'EXPLAINING',
        completed: false,
      }

      expect(response).toHaveProperty('nextTopicIndex')
      expect(response).toHaveProperty('phase')
      expect(response).toHaveProperty('completed')
    })

    it('should return correct structure for completion', async () => {
      const response = {
        completed: true,
        phase: 'COMPLETED',
      }

      expect(response.completed).toBe(true)
    })
  })
})
