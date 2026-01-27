/**
 * Shared TypeScript type definitions
 */

import type {
  User,
  Course,
  File,
  TopicGroup,
  SubTopic,
  TopicTest,
  LearningSession,
  TopicProgress,
  SubTopicProgress,
  Quota,
  UserPreference,
  Admin,
  UserRole,
  FileStatus,
  FileType,
  StructureStatus,
  TopicType,
  QuestionType,
  SessionStatus,
  LearningPhase,
  ProgressStatus,
  QuotaBucket,
} from '@prisma/client'

// Re-export Prisma types
export type {
  User,
  Course,
  File,
  TopicGroup,
  SubTopic,
  TopicTest,
  LearningSession,
  TopicProgress,
  SubTopicProgress,
  Quota,
  UserPreference,
  Admin,
  UserRole,
  FileStatus,
  FileType,
  StructureStatus,
  TopicType,
  QuestionType,
  SessionStatus,
  LearningPhase,
  ProgressStatus,
  QuotaBucket,
}

// Extended types with relations
export type CourseWithFiles = Course & {
  files: File[]
  _count?: {
    files: number
  }
}

export type FileWithTopics = File & {
  topicGroups: TopicGroup[]
  _count?: {
    topicGroups: number
  }
}

export type TopicGroupWithSubTopics = TopicGroup & {
  subTopics: SubTopic[]
  tests: TopicTest[]
}

export type LearningSessionWithProgress = LearningSession & {
  topicProgress: TopicProgress[]
  subTopicProgress: SubTopicProgress[]
  file: FileWithTopics
}

export type UserWithQuotas = User & {
  quotas: Quota[]
  preference: UserPreference | null
}

// API Types
export type PaginationParams = {
  page: number
  pageSize: number
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// UI State Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export type QuotaStatus = {
  bucket: QuotaBucket
  used: number
  limit: number
  percentage: number
  color: 'success' | 'warning' | 'destructive'
}

export type QuotaStatusResponse = {
  learningInteractions: {
    used: number
    limit: number
    remaining: number
    percentage: number
    resetAt: string // Changed from Date to string for proper JSON serialization
    status: 'green' | 'yellow' | 'red'
  }
  autoExplain: {
    used: number
    limit: number
    remaining: number
    percentage: number
    resetAt: string // Changed from Date to string for proper JSON serialization
    status: 'green' | 'yellow' | 'red'
  }
}

// File Upload Types
export type UploadProgress = {
  fileId: string
  fileName: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

// Learning Types
// Re-export from database.ts
export type { SubTopicExplanation, ExplanationLayer } from './database'

export type TestQuestion = TopicTest & {
  userAnswer?: string
  isCorrect?: boolean
  attempts?: number
}

// Utility Types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
