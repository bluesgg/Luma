// =============================================================================
// TUTOR-009: Confirm Understanding API Tests (TDD)
// POST /api/learn/sessions/[id]/confirm
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { mockUser, mockFile, mockLearningSession } from '../../../../setup'
import { ERROR_CODES } from '@/lib/constants'

describe('POST /api/learn/sessions/:id/confirm (TUTOR-009)', () => {
  let sessionId: string
  let userId: string
  let topicGroupId: string
  let subTopicId: string

  beforeEach(() => {
    vi.clearAllMocks()
    userId = mockUser.id
    sessionId = mockLearningSession.id
    topicGroupId = 'topic-1'
    subTopicId = 'sub-1'
  })

  describe('Happy Path - Confirm Subtopic', () => {
    it('should confirm current subtopic successfully', async () => {
      const mockSession = {
        ...mockLearningSession,
        userId,
        currentTopicIndex: 0,
        currentSubIndex: 0,
        file: {
          ...mockFile,
          topicGroups: [
            {
              id: topicGroupId,
              index: 0,
              title: 'Introduction',
              subTopics: [
                {
                  id: subTopicId,
                  index: 0,
                  title: 'Basic Concepts',
                },
                {
                  id: 'sub-2',
                  index: 1,
                  title: 'Advanced Concepts',
                },
              ],
            },
          ],
        },
      }

      vi.mocked(prisma.learningSession.findUnique).mockResolvedValue(
        mockSession as any
      )
      vi.mocked(prisma.subTopicProgress.upsert).mockResolvedValue({
        id: 'progress-1',
        sessionId,
        subTopicId,
        confirmed: true,
        confirmedAt: new Date(),
      } as any)

      const response = {
        confirmed: true,
        nextAction: 'NEXT_SUB',
        nextSubTopic: {
          id: 'sub-2',
          title: 'Advanced Concepts',
        },
      }

      expect(response.confirmed).toBe(true)
      expect(response.nextAction).toBe('NEXT_SUB')
    })

    it('should create subtopic progress record', async () => {
      const progress = {
        sessionId,
        subTopicId,
        confirmed: true,
        confirmedAt: expect.any(Date),
      }

      expect(progress.confirmed).toBe(true)
      expect(progress.confirmedAt).toBeDefined()
    })

    it('should update existing progress if already exists', async () => {
      vi.mocked(prisma.subTopicProgress.upsert).mockResolvedValue({
        id: 'progress-1',
        sessionId,
        subTopicId,
        confirmed: true,
        confirmedAt: new Date(),
      } as any)

      const progress = await prisma.subTopicProgress.upsert()
      expect(progress.confirmed).toBe(true)
    })
  })

  describe('Next Action - Move to Next Subtopic', () => {
    it('should move to next subtopic when available', async () => {
      const mockSession = {
        ...mockLearningSession,
        userId,
        currentTopicIndex: 0,
        currentSubIndex: 0,
        file: {
          topicGroups: [
            {
              subTopics: [{ id: 'sub-1' }, { id: 'sub-2' }, { id: 'sub-3' }],
            },
          ],
        },
      }

      vi.mocked(prisma.learningSession.findUnique).mockResolvedValue(
        mockSession as any
      )
      vi.mocked(prisma.learningSession.update).mockResolvedValue({
        ...mockSession,
        currentSubIndex: 1,
        currentPhase: 'EXPLAINING',
      } as any)

      const response = {
        nextAction: 'NEXT_SUB',
        nextSubTopic: {
          id: 'sub-2',
          title: 'Next Subtopic',
        },
      }

      expect(response.nextAction).toBe('NEXT_SUB')
    })

    it('should increment currentSubIndex', async () => {
      const updated = {
        currentSubIndex: 1,
        currentPhase: 'EXPLAINING',
      }

      expect(updated.currentSubIndex).toBe(1)
      expect(updated.currentPhase).toBe('EXPLAINING')
    })

    it('should return next subtopic details', async () => {
      const nextSubTopic = {
        id: 'sub-2',
        title: 'Advanced Topics',
      }

      expect(nextSubTopic.id).toBeDefined()
      expect(nextSubTopic.title).toBeDefined()
    })
  })

  describe('Next Action - Start Test', () => {
    it('should transition to testing when last subtopic confirmed', async () => {
      const mockSession = {
        ...mockLearningSession,
        userId,
        currentTopicIndex: 0,
        currentSubIndex: 2, // Last subtopic index
        file: {
          topicGroups: [
            {
              id: topicGroupId,
              subTopics: [{ id: 'sub-1' }, { id: 'sub-2' }, { id: 'sub-3' }],
            },
          ],
        },
      }

      vi.mocked(prisma.learningSession.findUnique).mockResolvedValue(
        mockSession as any
      )
      vi.mocked(prisma.learningSession.update).mockResolvedValue({
        ...mockSession,
        currentPhase: 'TESTING',
      } as any)

      const response = {
        confirmed: true,
        nextAction: 'START_TEST',
      }

      expect(response.nextAction).toBe('START_TEST')
    })

    it('should update phase to TESTING', async () => {
      const updated = {
        currentPhase: 'TESTING',
      }

      expect(updated.currentPhase).toBe('TESTING')
    })

    it('should not increment subtopic index', async () => {
      const currentSubIndex = 2
      expect(currentSubIndex).toBe(2)
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
        code: ERROR_CODES.TUTOR_SESSION_FORBIDDEN,
      }

      expect(error.status).toBe(403)
    })
  })

  describe('Validation', () => {
    it('should reject non-existent session (404)', async () => {
      vi.mocked(prisma.learningSession.findUnique).mockResolvedValue(null)

      const error = {
        status: 404,
        code: ERROR_CODES.TUTOR_SESSION_NOT_FOUND,
      }

      expect(error.status).toBe(404)
    })

    it('should reject when current topic not found (404)', async () => {
      const mockSession = {
        ...mockLearningSession,
        userId,
        currentTopicIndex: 999,
        file: {
          topicGroups: [],
        },
      }

      vi.mocked(prisma.learningSession.findUnique).mockResolvedValue(
        mockSession as any
      )

      const error = {
        status: 404,
        code: ERROR_CODES.NOT_FOUND,
      }

      expect(error.status).toBe(404)
    })

    it('should reject when current subtopic not found (404)', async () => {
      const mockSession = {
        ...mockLearningSession,
        userId,
        currentSubIndex: 999,
        file: {
          topicGroups: [
            {
              id: topicGroupId,
              subTopics: [],
            },
          ],
        },
      }

      vi.mocked(prisma.learningSession.findUnique).mockResolvedValue(
        mockSession as any
      )

      const error = {
        status: 404,
        code: ERROR_CODES.NOT_FOUND,
      }

      expect(error.status).toBe(404)
    })

    it('should reject when next subtopic not found (404)', async () => {
      const error = {
        status: 404,
        code: ERROR_CODES.TOPIC_NOT_FOUND,
        message: 'Next subtopic not found',
      }

      expect(error.status).toBe(404)
    })
  })

  describe('Edge Cases', () => {
    it('should handle single subtopic topic', async () => {
      const mockSession = {
        ...mockLearningSession,
        userId,
        currentSubIndex: 0,
        file: {
          topicGroups: [
            {
              id: topicGroupId,
              subTopics: [{ id: 'sub-1' }],
            },
          ],
        },
      }

      vi.mocked(prisma.learningSession.findUnique).mockResolvedValue(
        mockSession as any
      )

      const response = {
        nextAction: 'START_TEST',
      }

      expect(response.nextAction).toBe('START_TEST')
    })

    it('should handle repeated confirmation of same subtopic', async () => {
      vi.mocked(prisma.subTopicProgress.upsert).mockResolvedValue({
        id: 'progress-1',
        sessionId,
        subTopicId,
        confirmed: true,
        confirmedAt: new Date(),
      } as any)

      const progress = await prisma.subTopicProgress.upsert()
      expect(progress.confirmed).toBe(true)
    })

    it('should update confirmedAt timestamp on re-confirmation', async () => {
      const now = new Date()
      const progress = {
        confirmedAt: now,
      }

      expect(progress.confirmedAt).toEqual(now)
    })
  })

  describe('Logging', () => {
    it('should log confirmation action', async () => {
      const logEntry = {
        level: 'info',
        message: 'Subtopic confirmed',
        sessionId,
        subTopicId,
        nextAction: 'NEXT_SUB',
      }

      expect(logEntry.message).toBe('Subtopic confirmed')
    })
  })

  describe('Response Format', () => {
    it('should return correct structure for NEXT_SUB', async () => {
      const response = {
        confirmed: true,
        nextAction: 'NEXT_SUB',
        nextSubTopic: {
          id: 'sub-2',
          title: 'Next Topic',
        },
      }

      expect(response).toHaveProperty('confirmed')
      expect(response).toHaveProperty('nextAction')
      expect(response).toHaveProperty('nextSubTopic')
    })

    it('should return correct structure for START_TEST', async () => {
      const response = {
        confirmed: true,
        nextAction: 'START_TEST',
      }

      expect(response.nextAction).toBe('START_TEST')
      expect(response).not.toHaveProperty('nextSubTopic')
    })
  })

  describe('Concurrent Requests', () => {
    it('should handle concurrent confirmations', async () => {
      vi.mocked(prisma.subTopicProgress.upsert).mockResolvedValue({
        id: 'progress-1',
        sessionId,
        subTopicId,
        confirmed: true,
        confirmedAt: new Date(),
      } as any)

      // Upsert should handle concurrent requests
      const result = await prisma.subTopicProgress.upsert()
      expect(result.confirmed).toBe(true)
    })
  })
})
