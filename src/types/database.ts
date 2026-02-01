/**
 * Database Types
 *
 * Extended types based on Prisma schema
 */

import { Prisma } from '@prisma/client'

// =============================================================================
// Re-export Prisma types
// =============================================================================

export type User = Prisma.UserGetPayload<object>
export type Course = Prisma.CourseGetPayload<object>
export type File = Prisma.FileGetPayload<object>
export type TopicGroup = Prisma.TopicGroupGetPayload<object>
export type SubTopic = Prisma.SubTopicGetPayload<object>
export type LearningSession = Prisma.LearningSessionGetPayload<object>
export type SubTopicProgress = Prisma.SubTopicProgressGetPayload<object>
export type SubTopicCache = Prisma.SubTopicCacheGetPayload<object>
export type QAMessage = Prisma.QAMessageGetPayload<object>
export type Quota = Prisma.QuotaGetPayload<object>
export type QuotaLog = Prisma.QuotaLogGetPayload<object>
export type AIUsageLog = Prisma.AIUsageLogGetPayload<object>
export type UserPreference = Prisma.UserPreferenceGetPayload<object>
export type Admin = Prisma.AdminGetPayload<object>
export type VerificationToken = Prisma.VerificationTokenGetPayload<object>

// =============================================================================
// Enums
// =============================================================================

export {
  TokenType,
  FileStatus,
  StructureStatus,
  SessionStatus,
  SubTopicStatus,
  QARole,
  FeatureType,
  AdminRole,
} from '@prisma/client'

// =============================================================================
// Extended Types with Relations
// =============================================================================

export type CourseWithFiles = Prisma.CourseGetPayload<{
  include: { files: true }
}>

export type FileWithTopics = Prisma.FileGetPayload<{
  include: {
    topicGroups: {
      include: {
        subTopics: true
      }
    }
  }
}>

export type LearningSessionWithProgress = Prisma.LearningSessionGetPayload<{
  include: {
    subTopicProgress: {
      include: {
        subTopic: true
      }
    }
    file: {
      include: {
        topicGroups: {
          include: {
            subTopics: true
          }
        }
      }
    }
  }
}>

export type SubTopicWithCache = Prisma.SubTopicGetPayload<{
  include: {
    subTopicCache: true
  }
}>

// =============================================================================
// Custom Types
// =============================================================================

/**
 * Quiz structure (stored as JSON in SubTopicCache)
 */
export interface Quiz {
  question: string
  options: [string, string, string, string] // Always 4 options (A, B, C, D)
  correctAnswers: number[] // Indices of correct options (2-3 items)
  explanation: string // Explanation shown after wrong answer
}

/**
 * Safe user type (without password hash)
 */
export type SafeUser = Omit<User, 'passwordHash' | 'failedLoginCount' | 'lockedUntil'>

/**
 * Safe admin type (without password hash)
 */
export type SafeAdmin = Omit<Admin, 'passwordHash'>
