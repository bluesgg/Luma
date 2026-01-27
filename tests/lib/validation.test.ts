// =============================================================================
// Validation Helpers with Zod Schemas Tests
// =============================================================================

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// =============================================================================
// Common Validation Schemas
// =============================================================================

// Email validation
const emailSchema = z.string().email('Invalid email format')

// Password validation (min 8 characters)
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')

// User registration schema
const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

// User login schema
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

// Course creation schema
const courseSchema = z.object({
  name: z
    .string()
    .min(1, 'Course name is required')
    .max(50, 'Course name must be at most 50 characters'),
  school: z
    .string()
    .max(100, 'School name must be at most 100 characters')
    .optional(),
  term: z.string().max(50, 'Term must be at most 50 characters').optional(),
})

// File upload schema
const fileUploadSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name must be at most 255 characters')
    .regex(/\.pdf$/i, 'Only PDF files are allowed'),
  fileSize: z
    .number()
    .positive('File size must be positive')
    .max(200 * 1024 * 1024, 'File size must not exceed 200MB'),
  pageCount: z
    .number()
    .int('Page count must be an integer')
    .positive('Page count must be positive')
    .max(500, 'Page count must not exceed 500'),
})

// Pagination schema
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

// ID parameter schema
const idSchema = z.object({
  id: z.string().min(1, 'ID is required'),
})

// Query filters schema
const queryFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED']).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Answer submission schema
const answerSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  answer: z.string().min(1, 'Answer is required'),
})

// Preferences schema
const preferencesSchema = z.object({
  uiLocale: z.enum(['en', 'zh'], {
    errorMap: () => ({ message: 'UI locale must be en or zh' }),
  }),
  explainLocale: z.enum(['en', 'zh'], {
    errorMap: () => ({ message: 'Explain locale must be en or zh' }),
  }),
})

// =============================================================================
// Validation Helper Function
// =============================================================================

function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: boolean
  data?: T
  errors?: Record<string, string>
} {
  try {
    const validData = schema.parse(data)
    return { success: true, data: validData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.errors.forEach((err) => {
        const path = err.path.join('.')
        errors[path] = err.message
      })
      return { success: false, errors }
    }
    return { success: false, errors: { _error: 'Validation failed' } }
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('Validation Helpers', () => {
  describe('Email Validation', () => {
    it('should validate correct email', () => {
      const result = validateData(emailSchema, 'user@example.com')
      expect(result.success).toBe(true)
      expect(result.data).toBe('user@example.com')
    })

    it('should reject invalid email format', () => {
      const result = validateData(emailSchema, 'invalid-email')
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should accept various valid email formats', () => {
      const validEmails = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com',
      ]

      validEmails.forEach((email) => {
        const result = validateData(emailSchema, email)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'plaintext',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
      ]

      invalidEmails.forEach((email) => {
        const result = validateData(emailSchema, email)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Password Validation', () => {
    it('should validate password with minimum length', () => {
      const result = validateData(passwordSchema, 'password123')
      expect(result.success).toBe(true)
    })

    it('should reject password shorter than 8 characters', () => {
      const result = validateData(passwordSchema, 'pass')
      expect(result.success).toBe(false)
      expect(
        result.errors?.['_error'] || result.errors?.['password']
      ).toContain('8')
    })

    it('should accept exactly 8 characters', () => {
      const result = validateData(passwordSchema, '12345678')
      expect(result.success).toBe(true)
    })

    it('should accept long passwords', () => {
      const result = validateData(passwordSchema, 'a'.repeat(100))
      expect(result.success).toBe(true)
    })
  })

  describe('User Registration Schema', () => {
    it('should validate correct registration data', () => {
      const data = {
        email: 'user@example.com',
        password: 'password123',
      }

      const result = validateData(registerSchema, data)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(data)
    })

    it('should reject missing email', () => {
      const data = {
        password: 'password123',
      }

      const result = validateData(registerSchema, data)
      expect(result.success).toBe(false)
      expect(result.errors).toHaveProperty('email')
    })

    it('should reject missing password', () => {
      const data = {
        email: 'user@example.com',
      }

      const result = validateData(registerSchema, data)
      expect(result.success).toBe(false)
      expect(result.errors).toHaveProperty('password')
    })

    it('should reject both invalid email and short password', () => {
      const data = {
        email: 'invalid-email',
        password: 'short',
      }

      const result = validateData(registerSchema, data)
      expect(result.success).toBe(false)
      expect(result.errors).toHaveProperty('email')
      expect(result.errors).toHaveProperty('password')
    })
  })

  describe('User Login Schema', () => {
    it('should validate correct login data', () => {
      const data = {
        email: 'user@example.com',
        password: 'anypassword',
        rememberMe: true,
      }

      const result = validateData(loginSchema, data)
      expect(result.success).toBe(true)
    })

    it('should allow optional rememberMe', () => {
      const data = {
        email: 'user@example.com',
        password: 'password',
      }

      const result = validateData(loginSchema, data)
      expect(result.success).toBe(true)
    })

    it('should reject empty password', () => {
      const data = {
        email: 'user@example.com',
        password: '',
      }

      const result = validateData(loginSchema, data)
      expect(result.success).toBe(false)
    })
  })

  describe('Course Schema', () => {
    it('should validate correct course data', () => {
      const data = {
        name: 'Introduction to Computer Science',
        school: 'MIT',
        term: 'Fall 2024',
      }

      const result = validateData(courseSchema, data)
      expect(result.success).toBe(true)
    })

    it('should allow optional school and term', () => {
      const data = {
        name: 'Course Name',
      }

      const result = validateData(courseSchema, data)
      expect(result.success).toBe(true)
    })

    it('should reject empty course name', () => {
      const data = {
        name: '',
      }

      const result = validateData(courseSchema, data)
      expect(result.success).toBe(false)
    })

    it('should reject course name longer than 50 characters', () => {
      const data = {
        name: 'a'.repeat(51),
      }

      const result = validateData(courseSchema, data)
      expect(result.success).toBe(false)
    })

    it('should accept course name exactly 50 characters', () => {
      const data = {
        name: 'a'.repeat(50),
      }

      const result = validateData(courseSchema, data)
      expect(result.success).toBe(true)
    })
  })

  describe('File Upload Schema', () => {
    it('should validate correct file upload data', () => {
      const data = {
        courseId: 'course-123',
        fileName: 'lecture-notes.pdf',
        fileSize: 1024 * 1024, // 1MB
        pageCount: 10,
      }

      const result = validateData(fileUploadSchema, data)
      expect(result.success).toBe(true)
    })

    it('should reject non-PDF files', () => {
      const data = {
        courseId: 'course-123',
        fileName: 'document.docx',
        fileSize: 1024 * 1024,
        pageCount: 10,
      }

      const result = validateData(fileUploadSchema, data)
      expect(result.success).toBe(false)
    })

    it('should accept PDF with uppercase extension', () => {
      const data = {
        courseId: 'course-123',
        fileName: 'document.PDF',
        fileSize: 1024 * 1024,
        pageCount: 10,
      }

      const result = validateData(fileUploadSchema, data)
      expect(result.success).toBe(true)
    })

    it('should reject file size over 200MB', () => {
      const data = {
        courseId: 'course-123',
        fileName: 'large.pdf',
        fileSize: 201 * 1024 * 1024,
        pageCount: 10,
      }

      const result = validateData(fileUploadSchema, data)
      expect(result.success).toBe(false)
    })

    it('should reject page count over 500', () => {
      const data = {
        courseId: 'course-123',
        fileName: 'large.pdf',
        fileSize: 1024 * 1024,
        pageCount: 501,
      }

      const result = validateData(fileUploadSchema, data)
      expect(result.success).toBe(false)
    })

    it('should accept exactly 500 pages', () => {
      const data = {
        courseId: 'course-123',
        fileName: 'large.pdf',
        fileSize: 1024 * 1024,
        pageCount: 500,
      }

      const result = validateData(fileUploadSchema, data)
      expect(result.success).toBe(true)
    })
  })

  describe('Pagination Schema', () => {
    it('should validate pagination with defaults', () => {
      const result = validateData(paginationSchema, {})
      expect(result.success).toBe(true)
      expect(result.data?.page).toBe(1)
      expect(result.data?.limit).toBe(10)
    })

    it('should validate custom pagination', () => {
      const data = {
        page: 5,
        limit: 20,
      }

      const result = validateData(paginationSchema, data)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(data)
    })

    it('should coerce string numbers', () => {
      const data = {
        page: '3',
        limit: '25',
      }

      const result = validateData(paginationSchema, data)
      expect(result.success).toBe(true)
      expect(result.data?.page).toBe(3)
      expect(result.data?.limit).toBe(25)
    })

    it('should reject limit over 100', () => {
      const data = {
        page: 1,
        limit: 101,
      }

      const result = validateData(paginationSchema, data)
      expect(result.success).toBe(false)
    })

    it('should reject negative page', () => {
      const data = {
        page: -1,
        limit: 10,
      }

      const result = validateData(paginationSchema, data)
      expect(result.success).toBe(false)
    })
  })

  describe('ID Parameter Schema', () => {
    it('should validate valid ID', () => {
      const result = validateData(idSchema, { id: 'user-123' })
      expect(result.success).toBe(true)
    })

    it('should reject empty ID', () => {
      const result = validateData(idSchema, { id: '' })
      expect(result.success).toBe(false)
    })

    it('should reject missing ID', () => {
      const result = validateData(idSchema, {})
      expect(result.success).toBe(false)
    })
  })

  describe('Query Filters Schema', () => {
    it('should validate with all filters', () => {
      const data = {
        search: 'test',
        status: 'READY',
        sortBy: 'createdAt',
        sortOrder: 'asc',
      }

      const result = validateData(queryFiltersSchema, data)
      expect(result.success).toBe(true)
    })

    it('should validate with no filters', () => {
      const result = validateData(queryFiltersSchema, {})
      expect(result.success).toBe(true)
      expect(result.data?.sortOrder).toBe('desc') // default
    })

    it('should reject invalid status', () => {
      const data = {
        status: 'INVALID',
      }

      const result = validateData(queryFiltersSchema, data)
      expect(result.success).toBe(false)
    })

    it('should accept valid status values', () => {
      const statuses = ['PENDING', 'PROCESSING', 'READY', 'FAILED']

      statuses.forEach((status) => {
        const result = validateData(queryFiltersSchema, { status })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Answer Schema', () => {
    it('should validate correct answer', () => {
      const data = {
        questionId: 'q-123',
        answer: 'Option A',
      }

      const result = validateData(answerSchema, data)
      expect(result.success).toBe(true)
    })

    it('should reject empty answer', () => {
      const data = {
        questionId: 'q-123',
        answer: '',
      }

      const result = validateData(answerSchema, data)
      expect(result.success).toBe(false)
    })
  })

  describe('Preferences Schema', () => {
    it('should validate correct preferences', () => {
      const data = {
        uiLocale: 'en',
        explainLocale: 'zh',
      }

      const result = validateData(preferencesSchema, data)
      expect(result.success).toBe(true)
    })

    it('should reject invalid locale', () => {
      const data = {
        uiLocale: 'fr',
        explainLocale: 'en',
      }

      const result = validateData(preferencesSchema, data)
      expect(result.success).toBe(false)
    })

    it('should accept both en and zh', () => {
      const validData = [
        { uiLocale: 'en', explainLocale: 'en' },
        { uiLocale: 'zh', explainLocale: 'zh' },
        { uiLocale: 'en', explainLocale: 'zh' },
        { uiLocale: 'zh', explainLocale: 'en' },
      ]

      validData.forEach((data) => {
        const result = validateData(preferencesSchema, data)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Error Handling', () => {
    it('should return structured errors', () => {
      const data = {
        email: 'invalid',
        password: 'short',
      }

      const result = validateData(registerSchema, data)
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(typeof result.errors).toBe('object')
    })

    it('should include field names in errors', () => {
      const data = {
        email: 'invalid',
        password: 'short',
      }

      const result = validateData(registerSchema, data)
      expect(result.errors).toHaveProperty('email')
      expect(result.errors).toHaveProperty('password')
    })

    it('should provide meaningful error messages', () => {
      const data = {
        name: '',
      }

      const result = validateData(courseSchema, data)
      expect(result.errors?.name).toContain('required')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      const result = validateData(emailSchema, null)
      expect(result.success).toBe(false)
    })

    it('should handle undefined values', () => {
      const result = validateData(emailSchema, undefined)
      expect(result.success).toBe(false)
    })

    it('should handle empty objects', () => {
      const result = validateData(registerSchema, {})
      expect(result.success).toBe(false)
    })

    it('should handle extra fields', () => {
      const data = {
        email: 'user@example.com',
        password: 'password123',
        extraField: 'should be ignored',
      }

      const result = validateData(registerSchema, data)
      expect(result.success).toBe(true)
    })
  })
})
