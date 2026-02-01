/**
 * Course Management API Routes
 * POST /api/courses - Create a new course (CRS-001)
 * GET /api/courses - List all user courses (CRS-002)
 */

import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { apiRateLimit } from '@/lib/rate-limit'
import { requireCsrfToken } from '@/lib/csrf-server'
import { prisma } from '@/lib/prisma'
import { createCourseSchema } from '@/lib/validation'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ERROR_CODES, COURSE_LIMITS } from '@/lib/constants'
import { logger } from '@/lib/logger'

/**
 * POST /api/courses
 * Create a new course (CRS-001)
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    // Authentication
    const user = await requireAuth()
    userId = user.id

    // Rate limiting
    const rateLimitResult = await apiRateLimit(user.id)
    if (!rateLimitResult.allowed) {
      return errorResponse(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many requests',
        429
      )
    }

    // CSRF protection
    await requireCsrfToken(request)

    // Parse and validate request body
    let body: any
    try {
      body = await request.json()
    } catch {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid JSON in request body',
        400
      )
    }

    // Trim string fields and convert empty strings to null
    if (typeof body.name === 'string') body.name = body.name.trim()
    if (typeof body.school === 'string') {
      body.school = body.school.trim() || null
    }
    if (typeof body.term === 'string') {
      body.term = body.term.trim() || null
    }

    const validation = createCourseSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        validation.error.errors[0]?.message || 'Invalid data',
        400
      )
    }

    const data = validation.data

    // Create course with transaction to prevent race condition on course limit
    const course = await prisma.$transaction(
      async (tx) => {
        // Check course limit inside transaction
        const courseCount = await tx.course.count({
          where: { userId: user.id },
        })

        if (courseCount >= COURSE_LIMITS.MAX_COURSES_PER_USER) {
          throw Object.assign(
            new Error(
              `Maximum of ${COURSE_LIMITS.MAX_COURSES_PER_USER} courses allowed per user`
            ),
            { code: ERROR_CODES.COURSE_LIMIT_REACHED, status: 400 }
          )
        }

        // Create course atomically
        return await tx.course.create({
          data: {
            userId: user.id,
            name: data.name,
            school: data.school || null,
            term: data.term || null,
          },
        })
      },
      {
        isolationLevel: 'Serializable', // Prevent race conditions
      }
    )

    logger.info('Course created', {
      courseId: course.id,
      userId: user.id,
      name: course.name,
    })

    return successResponse(course, 201)
  } catch (error: any) {
    // Log the actual error properly
    logger.error('Failed to create course', error, {
      userId,
      errorName: error?.name,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorStack: error?.stack,
    })

    if (error.code) {
      return errorResponse(error.code, error.message, error.status || 500)
    }

    // Handle CSRF token errors specifically
    if (error?.message === 'Invalid CSRF token') {
      return errorResponse(
        ERROR_CODES.CSRF_TOKEN_INVALID,
        'Invalid CSRF token',
        403
      )
    }

    return errorResponse(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      error?.message || 'Failed to create course',
      500
    )
  }
}

/**
 * GET /api/courses
 * List all user courses (CRS-002)
 */
export async function GET(_request: NextRequest) {
  try {
    // Authentication
    const user = await requireAuth()

    // Rate limiting
    const rateLimitResult = await apiRateLimit(user.id)
    if (!rateLimitResult.allowed) {
      return errorResponse(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many requests',
        429
      )
    }

    // Fetch user's courses with files and file count
    const courses = await prisma.course.findMany({
      where: {
        userId: user.id,
      },
      include: {
        files: true, // Include full files array to match CourseWithFiles type
        _count: {
          select: {
            files: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Newest first
      },
    })

    return successResponse(courses)
  } catch (error: any) {
    logger.error('Failed to fetch courses', { error })

    if (error.code) {
      return errorResponse(error.code, error.message, error.status || 500)
    }

    return errorResponse(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Failed to fetch courses',
      500
    )
  }
}
