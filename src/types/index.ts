import type {
  Profile,
  Course,
  File,
  Explanation,
  QA,
  Quota,
  FileStatus,
  QuotaBucket,
  Locale,
} from '@prisma/client'

// Re-export Prisma types
export type { Profile, Course, File, Explanation, QA, Quota, FileStatus, QuotaBucket, Locale }

// Extended types with relations
export type CourseWithFiles = Course & {
  files: File[]
  _count: { files: number }
}

// Course list item for display purposes
export interface CourseListItem {
  id: string
  name: string
  school?: string | null
  term?: string | null
  _count: { files: number }
}

export type FileWithExplanations = File & {
  explanations: Explanation[]
  course: Course
}

// API Response types
export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

// User preferences
export interface UserPreferences {
  uiLocale: Locale
  explainLocale: Locale
}

// ============================================
// Auth Types
// ============================================

// Auth Request Types
export interface RegisterRequest {
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface ResendVerificationRequest {
  email: string
}

export interface ResetPasswordRequest {
  email: string
}

export interface ConfirmResetRequest {
  password: string
}

// Auth Response Types
export interface AuthUser {
  id: string
  email: string
  emailConfirmedAt: string | null
  createdAt: string
}

export interface AuthResponse {
  user: AuthUser
  profile: {
    userId: string
    role: string
    createdAt: string
    updatedAt: string
  }
}

// Auth Error Codes
export const AUTH_ERROR_CODES = {
  INVALID_EMAIL: 'AUTH_INVALID_EMAIL',
  WEAK_PASSWORD: 'AUTH_WEAK_PASSWORD',
  EMAIL_EXISTS: 'AUTH_EMAIL_EXISTS',
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  RATE_LIMITED: 'AUTH_RATE_LIMITED',
  SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  INTERNAL_ERROR: 'AUTH_INTERNAL_ERROR',
  CSRF_INVALID: 'AUTH_CSRF_INVALID',
  CSRF_MISSING: 'AUTH_CSRF_MISSING',
} as const

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]

// Course Error Codes
export const COURSE_ERROR_CODES = {
  LIMIT_EXCEEDED: 'COURSE_LIMIT_EXCEEDED',
  NAME_EXISTS: 'COURSE_NAME_EXISTS',
  NOT_FOUND: 'COURSE_NOT_FOUND',
  VALIDATION_ERROR: 'COURSE_VALIDATION_ERROR',
} as const

export type CourseErrorCode = (typeof COURSE_ERROR_CODES)[keyof typeof COURSE_ERROR_CODES]

// File Error Codes
export const FILE_ERROR_CODES = {
  TOO_LARGE: 'FILE_TOO_LARGE',
  TOO_MANY_PAGES: 'FILE_TOO_MANY_PAGES',
  LIMIT_EXCEEDED: 'FILE_LIMIT_EXCEEDED',
  NAME_EXISTS: 'FILE_NAME_EXISTS',
  NOT_FOUND: 'FILE_NOT_FOUND',
  STORAGE_EXCEEDED: 'FILE_STORAGE_EXCEEDED',
  INVALID_TYPE: 'FILE_INVALID_TYPE',
  VALIDATION_ERROR: 'FILE_VALIDATION_ERROR',
} as const

export type FileErrorCode = (typeof FILE_ERROR_CODES)[keyof typeof FILE_ERROR_CODES]

// AI Error Codes
export const AI_ERROR_CODES = {
  QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  FILE_NOT_READY: 'AI_FILE_NOT_READY',
  DISABLED_SCANNED: 'AI_DISABLED_SCANNED',
  SERVICE_ERROR: 'AI_SERVICE_ERROR',
  SERVICE_TIMEOUT: 'AI_SERVICE_TIMEOUT',
  VALIDATION_ERROR: 'AI_VALIDATION_ERROR',
} as const

export type AIErrorCode = (typeof AI_ERROR_CODES)[keyof typeof AI_ERROR_CODES]

// Admin Error Codes
export const ADMIN_ERROR_CODES = {
  UNAUTHORIZED: 'ADMIN_UNAUTHORIZED',
  NOT_FOUND: 'ADMIN_NOT_FOUND',
} as const

export type AdminErrorCode = (typeof ADMIN_ERROR_CODES)[keyof typeof ADMIN_ERROR_CODES]

// All Error Codes Union
export type AppErrorCode = AuthErrorCode | CourseErrorCode | FileErrorCode | AIErrorCode | AdminErrorCode

// Unified API Response Types
export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}
