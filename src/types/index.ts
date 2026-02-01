/**
 * Shared TypeScript type definitions
 */

import type {
  User,
  Course,
  Quota,
  UserPreference,
  Admin,
  UserRole,
  QuotaBucket,
} from '@prisma/client'

// Re-export Prisma types
export type {
  User,
  Course,
  Quota,
  UserPreference,
  Admin,
  UserRole,
  QuotaBucket,
}

// Extended types with relations
export type CourseWithFiles = Course & {
  _count?: {
    files: number
  }
}

export type QuotaStatusResponse = {
  learningInteractions: {
    used: number
    limit: number
    remaining: number
    percentage: number
    resetAt: string
    status: 'green' | 'yellow' | 'red'
  }
  autoExplain: {
    used: number
    limit: number
    remaining: number
    percentage: number
    resetAt: string
    status: 'green' | 'yellow' | 'red'
  }
}
