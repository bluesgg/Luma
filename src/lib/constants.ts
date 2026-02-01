/**
 * Application-wide constants
 */

// Error Codes
export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',

  // Course Management
  COURSE_LIMIT_REACHED: 'COURSE_LIMIT_REACHED',
  COURSE_NOT_FOUND: 'COURSE_NOT_FOUND',
  COURSE_FORBIDDEN: 'COURSE_FORBIDDEN',

  // Quota
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // General
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  CSRF_TOKEN_INVALID: 'CSRF_TOKEN_INVALID',
} as const

// Course Limits
export const COURSE_LIMITS = {
  MAX_COURSES_PER_USER: 6,
  MAX_NAME_LENGTH: 50,
  MAX_SCHOOL_LENGTH: 100,
  MAX_TERM_LENGTH: 50,
} as const

// Quota Limits
export const QUOTA_LIMITS = {
  LEARNING_INTERACTIONS: 150, // per month
  AUTO_EXPLAIN: 300, // per month
} as const

// Rate Limits (requests per window)
export const RATE_LIMITS = {
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  },
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
  EMAIL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
} as const

// Account Security
export const SECURITY = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  PASSWORD_MIN_LENGTH: 8,
  TOKEN_EXPIRY_HOURS: 24,
  SESSION_COOKIE_NAME: 'luma-session',
  SESSION_MAX_AGE_DAYS: 7,
  SESSION_MAX_AGE_REMEMBER_DAYS: 30,
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const

// Admin Security
export const ADMIN_SECURITY = {
  SESSION_COOKIE_NAME: 'luma-admin-session',
  SESSION_MAX_AGE_DAYS: 1, // 24 hours for admin sessions
} as const

// Admin Error Codes
export const ADMIN_ERROR_CODES = {
  ADMIN_UNAUTHORIZED: 'ADMIN_UNAUTHORIZED',
  ADMIN_FORBIDDEN: 'ADMIN_FORBIDDEN',
  ADMIN_DISABLED: 'ADMIN_DISABLED',
  ADMIN_INVALID_CREDENTIALS: 'ADMIN_INVALID_CREDENTIALS',
} as const
