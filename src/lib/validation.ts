import { z } from 'zod'
import { COURSE_LIMITS, FILE_LIMITS, SECURITY } from './constants'

/**
 * Common validation schemas
 */

// Authentication
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(
      SECURITY.PASSWORD_MIN_LENGTH,
      'Password must be at least 8 characters'
    ),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
})

export const confirmResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(
      SECURITY.PASSWORD_MIN_LENGTH,
      'Password must be at least 8 characters'
    ),
})

// Course Management
export const createCourseSchema = z.object({
  name: z
    .string()
    .min(1, 'Course name is required')
    .max(
      COURSE_LIMITS.MAX_NAME_LENGTH,
      `Course name must be less than ${COURSE_LIMITS.MAX_NAME_LENGTH} characters`
    ),
  school: z
    .string()
    .max(
      COURSE_LIMITS.MAX_SCHOOL_LENGTH,
      `School name must be less than ${COURSE_LIMITS.MAX_SCHOOL_LENGTH} characters`
    )
    .optional()
    .nullable(),
  term: z
    .string()
    .max(
      COURSE_LIMITS.MAX_TERM_LENGTH,
      `Term must be less than ${COURSE_LIMITS.MAX_TERM_LENGTH} characters`
    )
    .optional()
    .nullable(),
})

export const updateCourseSchema = createCourseSchema.partial()

// File Management
export const createFileSchema = z.object({
  courseId: z.string().cuid('Invalid course ID'),
  name: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name too long'),
  fileSize: z
    .number()
    .max(
      FILE_LIMITS.MAX_FILE_SIZE,
      `File size must be less than ${FILE_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`
    ),
  pageCount: z
    .number()
    .max(
      FILE_LIMITS.MAX_PAGE_COUNT,
      `File must have less than ${FILE_LIMITS.MAX_PAGE_COUNT} pages`
    )
    .optional()
    .nullable(),
})

export const uploadUrlSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().positive('File size must be positive'),
  fileType: z.string().min(1, 'File type is required'),
  courseId: z.string().cuid('Invalid course ID'),
})

export const confirmUploadSchema = z.object({
  fileId: z.string().cuid('Invalid file ID'),
  storagePath: z.string().min(1, 'Storage path is required'),
})

// Learning Session
export const startLearningSchema = z.object({
  fileId: z.string().cuid('Invalid file ID'),
})

export const confirmSubTopicSchema = z.object({
  subTopicId: z.string().cuid('Invalid sub-topic ID'),
})

export const submitAnswerSchema = z.object({
  questionId: z.string().cuid('Invalid question ID'),
  answer: z.string().min(1, 'Answer is required'),
})

// User Preferences
export const updatePreferencesSchema = z.object({
  uiLocale: z.enum(['en', 'zh']).optional(),
  explainLocale: z.enum(['en', 'zh']).optional(),
})

// Admin
export const adjustQuotaSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  bucket: z.enum(['LEARNING_INTERACTIONS', 'AUTO_EXPLAIN']),
  amount: z.number().int('Amount must be an integer'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
})

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

// Admin
export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const quotaAdjustmentSchema = z.object({
  bucket: z.enum(['LEARNING_INTERACTIONS', 'AUTO_EXPLAIN']),
  action: z.enum(['set_limit', 'adjust_used', 'reset']),
  value: z.number().min(0).optional(),
  reason: z.string().min(1, 'Reason is required'),
})

// ID Validation
export const idSchema = z.string().cuid('Invalid ID format')
