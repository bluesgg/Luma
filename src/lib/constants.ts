// ============================================
// Authentication Constants
// ============================================

export const AUTH = {
  PASSWORD_MIN_LENGTH: 8,
  SESSION_DURATION_DEFAULT: 7 * 24 * 60 * 60, // 7 days in seconds
  SESSION_DURATION_REMEMBER: 30 * 24 * 60 * 60, // 30 days in seconds
  VERIFICATION_LINK_EXPIRY: 24 * 60 * 60, // 24 hours in seconds
  RESET_LINK_EXPIRY: 24 * 60 * 60, // 24 hours in seconds
  EMAIL_RATE_LIMIT: 5, // emails per 15 minutes
  EMAIL_RATE_WINDOW: 15 * 60, // 15 minutes in seconds
  LOGIN_LOCKOUT_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 30 * 60, // 30 minutes in seconds
} as const

// ============================================
// Quota Constants
// ============================================

export const QUOTA = {
  LEARNING_INTERACTIONS_LIMIT: 150,
  AUTO_EXPLAIN_LIMIT: 300,
} as const

// ============================================
// Storage Constants
// ============================================

export const STORAGE = {
  MAX_FILE_SIZE: 200 * 1024 * 1024, // 200MB
  MAX_PAGE_COUNT: 500,
  MAX_FILES_PER_COURSE: 30,
  MAX_USER_STORAGE: 5 * 1024 * 1024 * 1024, // 5GB
  MAX_COURSES_PER_USER: 6,
} as const

// ============================================
// PDF Processing Constants
// ============================================

export const PDF = {
  /** Number of pages to sample when detecting scanned PDFs */
  SCANNED_DETECTION_SAMPLE_SIZE: 5,
  /** Minimum text items on a page to consider it as having text */
  MIN_TEXT_ITEMS_THRESHOLD: 50,
  /** Ratio threshold below which a PDF is considered scanned (text pages / sample pages < 0.2) */
  SCANNED_THRESHOLD_RATIO: 0.2,
} as const

// ============================================
// URL Validation Constants
// ============================================

/**
 * Allowed redirect origins for email links and authentication flows
 * In production, only include your actual domains
 */
export const ALLOWED_REDIRECT_ORIGINS =
  process.env.NODE_ENV === 'production'
    ? ['https://luma.app', 'https://www.luma.app']
    : ['http://localhost:3000', 'http://localhost:4000']

// ============================================
// Route Constants
// ============================================

/**
 * Route patterns for authentication middleware
 */
export const ROUTES = {
  /**
   * Auth-only routes - authenticated users should be redirected to /courses
   * These are pages for unauthenticated users only (login, register, etc.)
   */
  AUTH_ONLY: ['/login', '/register', '/forgot-password', '/reset-password'] as const,

  /**
   * Protected routes - require authentication
   * Unauthenticated users should be redirected to /login
   */
  PROTECTED: ['/courses', '/files', '/reader', '/settings'] as const,

  /**
   * Admin routes - require authentication (role check at route handler level)
   */
  ADMIN: ['/admin'] as const,

  /**
   * Admin login route - accessible without authentication
   */
  ADMIN_LOGIN: '/admin/login' as const,

  /**
   * Public API routes - no authentication required
   */
  PUBLIC_API: [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/reset-password',
    '/api/auth/resend-verification',
    '/api/auth/verify-email',
  ] as const,

  /**
   * CRON API routes - require CRON_SECRET validation
   */
  CRON: '/api/cron' as const,

  /**
   * Default redirect destinations
   */
  REDIRECTS: {
    AFTER_LOGIN: '/courses',
    AFTER_LOGOUT: '/login',
    UNAUTHENTICATED: '/login',
    ADMIN_UNAUTHENTICATED: '/admin/login',
  } as const,
} as const
