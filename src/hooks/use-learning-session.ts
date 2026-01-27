'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { useToast } from './use-toast'

/**
 * TUTOR-026: useLearningSession Hook
 *
 * Hook for managing learning session state with:
 * - TanStack Query for session data
 * - Mutations for confirm, answer, skip, next, pause
 * - Progress calculation helpers
 */

/**
 * Types
 */
export interface SubTopicMetadata {
  summary: string
  keywords: string[]
  relatedPages: number[]
}

export interface SubTopic {
  id: string
  index: number
  title: string
  metadata: SubTopicMetadata
}

export interface TopicGroup {
  id: string
  index: number
  title: string
  type: 'CORE' | 'SUPPORTING'
  pageStart: number | null
  pageEnd: number | null
  subTopics: SubTopic[]
}

export interface TopicProgress {
  id: string
  topicGroupId: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
  isWeakPoint: boolean
  totalAttempts: number
  correctCount: number
  wrongCount: number
}

export interface SubTopicProgress {
  id: string
  subTopicId: string
  confirmed: boolean
  confirmedAt: string | null
}

export interface LearningSession {
  id: string
  userId: string
  fileId: string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED'
  currentTopicIndex: number
  currentSubIndex: number
  currentPhase: 'EXPLAINING' | 'CONFIRMING' | 'TESTING'
  startedAt: string
  lastActiveAt: string
  completedAt: string | null
  file: {
    id: string
    name: string
    topicGroups: TopicGroup[]
  }
  topicProgress: TopicProgress[]
  subTopicProgress: SubTopicProgress[]
}

export interface TestQuestion {
  index: number
  type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER'
  question: string
  options?: string[]
}

/**
 * Query keys
 */
export const learningSessionKeys = {
  all: ['learning-sessions'] as const,
  detail: (id: string) => [...learningSessionKeys.all, id] as const,
}

/**
 * Hook to fetch learning session
 */
export function useLearningSession(
  sessionId: string | undefined,
  options?: Omit<
    UseQueryOptions<LearningSession, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<LearningSession, Error>({
    queryKey: sessionId ? learningSessionKeys.detail(sessionId) : [],
    queryFn: async () => {
      if (!sessionId) {
        throw new Error('Session ID is required')
      }
      return await apiClient.get<LearningSession>(
        `/api/learn/sessions/${sessionId}`
      )
    },
    enabled: !!sessionId,
    staleTime: 10000, // 10 seconds
    ...options,
  })
}

/**
 * Hook to confirm understanding
 */
export function useConfirmUnderstanding() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<any, Error, { sessionId: string }>({
    mutationFn: async ({ sessionId }) => {
      return await apiClient.post(
        `/api/learn/sessions/${sessionId}/confirm`,
        {}
      )
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({
        queryKey: learningSessionKeys.detail(sessionId),
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to confirm',
        description: error.message || 'Failed to confirm understanding',
      })
    },
  })
}

/**
 * Hook to get test questions
 */
export function useGetTest() {
  const { toast } = useToast()

  return useMutation<
    {
      questions: TestQuestion[]
      currentQuestionIndex: number
      completed: boolean
    },
    Error,
    { sessionId: string }
  >({
    mutationFn: async ({ sessionId }) => {
      return await apiClient.post(`/api/learn/sessions/${sessionId}/test`, {})
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to load test',
        description: error.message || 'Failed to load test questions',
      })
    },
  })
}

/**
 * Hook to submit answer
 */
export function useSubmitAnswer() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<
    {
      correct: boolean
      attemptCount: number
      explanation: string
      reExplanation?: string
      canRetry: boolean
      correctAnswer?: string
    },
    Error,
    { sessionId: string; questionIndex: number; answer: string }
  >({
    mutationFn: async ({ sessionId, questionIndex, answer }) => {
      return await apiClient.post(`/api/learn/sessions/${sessionId}/answer`, {
        questionIndex,
        answer,
      })
    },
    onSuccess: (data, { sessionId }) => {
      queryClient.invalidateQueries({
        queryKey: learningSessionKeys.detail(sessionId),
      })

      if (data.correct) {
        toast({
          title: 'Correct!',
          description: 'Great job! Moving to next question.',
        })
      }
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to submit answer',
        description: error.message || 'Failed to submit answer',
      })
    },
  })
}

/**
 * Hook to skip question
 */
export function useSkipQuestion() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<
    { skipped: boolean; correctAnswer: string; explanation: string },
    Error,
    { sessionId: string; questionIndex: number }
  >({
    mutationFn: async ({ sessionId, questionIndex }) => {
      return await apiClient.post(`/api/learn/sessions/${sessionId}/skip`, {
        questionIndex,
      })
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({
        queryKey: learningSessionKeys.detail(sessionId),
      })
      toast({
        title: 'Question skipped',
        description: 'Moving to next question',
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to skip',
        description: error.message || 'Failed to skip question',
      })
    },
  })
}

/**
 * Hook to advance to next topic
 */
export function useNextTopic() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<
    {
      nextTopicIndex: number
      nextSubTopicIndex: number
      phase: 'EXPLAINING' | 'COMPLETED'
      completed: boolean
    },
    Error,
    { sessionId: string }
  >({
    mutationFn: async ({ sessionId }) => {
      return await apiClient.post(`/api/learn/sessions/${sessionId}/next`, {})
    },
    onSuccess: (data, { sessionId }) => {
      queryClient.invalidateQueries({
        queryKey: learningSessionKeys.detail(sessionId),
      })

      if (data.completed) {
        toast({
          title: 'Session completed!',
          description: 'Congratulations on completing all topics!',
        })
      }
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to advance',
        description: error.message || 'Failed to advance to next topic',
      })
    },
  })
}

/**
 * Hook to pause session
 */
export function usePauseSession() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<any, Error, { sessionId: string }>({
    mutationFn: async ({ sessionId }) => {
      return await apiClient.post(`/api/learn/sessions/${sessionId}/pause`, {})
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({
        queryKey: learningSessionKeys.detail(sessionId),
      })
      toast({
        title: 'Session paused',
        description: 'You can resume learning anytime',
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to pause',
        description: error.message || 'Failed to pause session',
      })
    },
  })
}

/**
 * Helper: Calculate session progress
 */
export function calculateProgress(session: LearningSession | undefined): {
  completed: number
  total: number
  percentage: number
} {
  if (!session) {
    return { completed: 0, total: 0, percentage: 0 }
  }

  const total = session.file.topicGroups.length
  const completed = session.topicProgress.filter(
    (tp) => tp.status === 'COMPLETED'
  ).length

  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

/**
 * Helper: Get current topic
 */
export function getCurrentTopic(
  session: LearningSession | undefined
): TopicGroup | null {
  if (!session) return null
  return session.file.topicGroups[session.currentTopicIndex] || null
}

/**
 * Helper: Get current subtopic
 */
export function getCurrentSubTopic(
  session: LearningSession | undefined
): SubTopic | null {
  const topic = getCurrentTopic(session)
  if (!topic || !session) return null
  return topic.subTopics[session.currentSubIndex] || null
}
