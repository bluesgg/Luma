/**
 * Application Constants
 *
 * Business rules and limits as defined in PRD
 */

// =============================================================================
// COURSE LIMITS
// =============================================================================

export const MAX_COURSES_PER_USER = 6
export const MAX_COURSE_NAME_LENGTH = 50

// =============================================================================
// FILE LIMITS
// =============================================================================

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024 // 500MB
export const MAX_FILE_PAGE_COUNT = 500
export const MAX_FILES_PER_COURSE = 30
export const MAX_STORAGE_PER_USER_BYTES = 5 * 1024 * 1024 * 1024 // 5GB

// =============================================================================
// AI QUOTA
// =============================================================================

export const DEFAULT_AI_INTERACTIONS_PER_MONTH = 500

// =============================================================================
// LEARNING LIMITS
// =============================================================================

export const MAX_QA_MESSAGES_PER_SUBTOPIC = 20
export const MAX_QUIZ_ATTEMPTS_PER_SUBTOPIC = 3

// =============================================================================
// AUTHENTICATION
// =============================================================================

export const MAX_FAILED_LOGIN_ATTEMPTS = 5
export const ACCOUNT_LOCKOUT_DURATION_MS = 30 * 60 * 1000 // 30 minutes
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
export const SESSION_DURATION_REMEMBER_ME_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
export const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours
export const PASSWORD_RESET_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

// =============================================================================
// RATE LIMITING
// =============================================================================

export const RATE_LIMIT_AUTH_REQUESTS = 10
export const RATE_LIMIT_AUTH_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export const RATE_LIMIT_API_REQUESTS = 100
export const RATE_LIMIT_API_WINDOW_MS = 60 * 1000 // 1 minute

export const RATE_LIMIT_AI_REQUESTS = 20
export const RATE_LIMIT_AI_WINDOW_MS = 60 * 1000 // 1 minute

export const RATE_LIMIT_EMAIL_REQUESTS = 5
export const RATE_LIMIT_EMAIL_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

// =============================================================================
// SUPPORTED LOCALES
// =============================================================================

export const SUPPORTED_UI_LOCALES = ['en', 'zh'] as const
export const SUPPORTED_EXPLAIN_LOCALES = ['en', 'zh'] as const
export const DEFAULT_UI_LOCALE = 'en'
export const DEFAULT_EXPLAIN_LOCALE = 'en'

// =============================================================================
// ERROR CODES
// =============================================================================

export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',

  // Course
  COURSE_LIMIT_REACHED: 'COURSE_LIMIT_REACHED',
  COURSE_NOT_FOUND: 'COURSE_NOT_FOUND',
  COURSE_UNAUTHORIZED: 'COURSE_UNAUTHORIZED',

  // File
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TOO_MANY_PAGES: 'FILE_TOO_MANY_PAGES',
  FILE_DUPLICATE_NAME: 'FILE_DUPLICATE_NAME',
  FILE_LIMIT_REACHED: 'FILE_LIMIT_REACHED',
  STORAGE_LIMIT_REACHED: 'STORAGE_LIMIT_REACHED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_UNAUTHORIZED: 'FILE_UNAUTHORIZED',

  // AI Tutor
  TUTOR_STRUCTURE_NOT_READY: 'TUTOR_STRUCTURE_NOT_READY',
  TUTOR_STRUCTURE_FAILED: 'TUTOR_STRUCTURE_FAILED',
  TUTOR_QUOTA_EXCEEDED: 'TUTOR_QUOTA_EXCEEDED',
  TUTOR_SESSION_NOT_FOUND: 'TUTOR_SESSION_NOT_FOUND',
  TUTOR_QA_LIMIT_REACHED: 'TUTOR_QA_LIMIT_REACHED',

  // Generic
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
