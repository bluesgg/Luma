import { z } from 'zod'
import { COURSE_LIMITS, SECURITY } from './constants'

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
