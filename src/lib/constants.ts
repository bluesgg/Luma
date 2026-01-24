// ==================== File Limits ====================

export const FILE_LIMITS = {
  MAX_FILE_SIZE: 200 * 1024 * 1024, // 200MB in bytes
  MAX_PAGE_COUNT: 500,
  MAX_FILES_PER_COURSE: 30,
  MAX_STORAGE_PER_USER: 5 * 1024 * 1024 * 1024, // 5GB in bytes
} as const;

// ==================== Course Limits ====================

export const COURSE_LIMITS = {
  MAX_COURSES_PER_USER: 6,
  MAX_NAME_LENGTH: 50,
} as const;

// ==================== Quota Limits ====================

export const QUOTA_LIMITS = {
  LEARNING_INTERACTIONS: 150, // per month
  AUTO_EXPLAIN: 300, // per month
} as const;

export const QUOTA_THRESHOLDS = {
  GREEN: 70, // < 70%
  YELLOW: 90, // 70-90%
  RED: 100, // > 90%
} as const;

// ==================== Authentication ====================

export const AUTH_CONFIG = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  SESSION_DURATION_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  SESSION_DURATION_REMEMBER_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  VERIFICATION_TOKEN_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
  RESET_TOKEN_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// ==================== Rate Limiting ====================

export const RATE_LIMITS = {
  EMAIL_RESEND_MAX: 5,
  EMAIL_RESEND_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  PASSWORD_RESET_MAX: 5,
  PASSWORD_RESET_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
} as const;

// ==================== AI Service ====================

export const AI_CONFIG = {
  TIMEOUT_MS: 30 * 1000, // 30 seconds
} as const;

// ==================== Worker Tasks ====================

export const WORKER_CONFIG = {
  ZOMBIE_TASK_THRESHOLD_MS: 10 * 60 * 1000, // 10 minutes
} as const;

// ==================== Supported Locales ====================

export const SUPPORTED_LOCALES = ["en", "zh"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_UI_LOCALE: SupportedLocale = "en";
export const DEFAULT_EXPLAIN_LOCALE: SupportedLocale = "en";
