/**
 * Course Management API Routes (Single Course)
 * GET /api/courses/[id] - Get single course (CRS-002)
 * PATCH /api/courses/[id] - Update course (CRS-003)
 * DELETE /api/courses/[id] - Delete course with cascade (CRS-004)
 */

import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { apiRateLimit } from '@/lib/rate-limit'
import { requireCsrfToken } from '@/lib/csrf-server'
import { prisma } from '@/lib/prisma'
import { updateCourseSchema } from '@/lib/validation'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/courses/[id]
 * Get single course (CRS-002)
 */
export async function GET(_request: NextRequest, context: RouteContext) {
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

    // Get course ID from params
    const { id: courseId } = await context.params

    // Fetch course with files to match CourseWithFiles type
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        files: true, // Include full files array to match CourseWithFiles type
        _count: {
          select: {
            files: true,
          },
        },
      },
    })

    if (!course) {
      return errorResponse(
        ERROR_CODES.COURSE_NOT_FOUND,
        'Course not found',
        404
      )
    }

    // Check ownership
    if (course.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.COURSE_FORBIDDEN,
        'You do not have permission to access this course',
        403
      )
    }

    return successResponse(course)
  } catch (error: any) {
    logger.error('Failed to fetch course', { error })

    if (error.code) {
      return errorResponse(error.code, error.message, error.status || 500)
    }

    return errorResponse(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Failed to fetch course',
      500
    )
  }
}

/**
 * PATCH /api/courses/[id]
 * Update course (CRS-003)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    // CSRF protection
    await requireCsrfToken(request)

    // Get course ID from params
    const { id: courseId } = await context.params

    // Fetch course to verify ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!course) {
      return errorResponse(
        ERROR_CODES.COURSE_NOT_FOUND,
        'Course not found',
        404
      )
    }

    // Check ownership
    if (course.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.COURSE_FORBIDDEN,
        'You do not have permission to update this course',
        403
      )
    }

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

    // Check if body is empty
    if (Object.keys(body).length === 0) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'At least one field is required for update',
        400
      )
    }

    // Trim string fields and convert empty strings to null
    if (body.name !== undefined && typeof body.name === 'string') {
      body.name = body.name.trim()
    }
    if (body.school !== undefined) {
      if (typeof body.school === 'string') {
        body.school = body.school.trim() || null
      } else {
        body.school = null
      }
    }
    if (body.term !== undefined) {
      if (typeof body.term === 'string') {
        body.term = body.term.trim() || null
      } else {
        body.term = null
      }
    }

    const validation = updateCourseSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        validation.error.errors[0]?.message || 'Invalid data',
        400
      )
    }

    const data = validation.data

    // Update course
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.school !== undefined && { school: data.school }),
        ...(data.term !== undefined && { term: data.term }),
      },
    })

    logger.info('Course updated', {
      courseId: updatedCourse.id,
      userId: user.id,
    })

    return successResponse(updatedCourse)
  } catch (error: any) {
    logger.error('Failed to update course', { error })

    if (error.code) {
      return errorResponse(error.code, error.message, error.status || 500)
    }

    return errorResponse(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Failed to update course',
      500
    )
  }
}

/**
 * DELETE /api/courses/[id]
 * Delete course with cascade (CRS-004)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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

    // CSRF protection
    await requireCsrfToken(request)

    // Get course ID from params
    const { id: courseId } = await context.params

    // Perform all database operations in a transaction
    const course = await prisma.$transaction(
      async (tx) => {
        // Fetch course with files
        const course = await tx.course.findUnique({
          where: { id: courseId },
          include: {
            files: {
              select: {
                id: true,
                storagePath: true,
              },
            },
          },
        })

        if (!course) {
          throw Object.assign(new Error('Course not found'), {
            code: ERROR_CODES.COURSE_NOT_FOUND,
            status: 404,
          })
        }

        // Check ownership
        if (course.userId !== user.id) {
          throw Object.assign(
            new Error('You do not have permission to delete this course'),
            { code: ERROR_CODES.COURSE_FORBIDDEN, status: 403 }
          )
        }

        // Delete course (cascade will delete all related records via Prisma)
        await tx.course.delete({
          where: { id: courseId },
        })

        return course
      },
      {
        isolationLevel: 'Serializable', // Prevent race conditions
      }
    )

    // Delete files from storage (best effort - after transaction)
    if (course.files.length > 0) {
      try {
        const supabase = await createClient()
        const filePaths = course.files.map((file) => file.storagePath)

        const { error: storageError } = await supabase.storage
          .from('files')
          .remove(filePaths)

        if (storageError) {
          // Distinguish between error types
          const isNotFound = storageError.message?.includes('not found')
          const logLevel = isNotFound ? 'info' : 'warn'

          logger[logLevel]('Storage deletion incomplete', {
            error: storageError,
            courseId,
            fileCount: course.files.length,
            errorType: isNotFound ? 'not_found' : 'storage_error',
          })
        }
      } catch (storageError) {
        logger.warn('Error during storage deletion', {
          error: storageError,
          courseId,
        })
        // Continue - database deletion already completed
      }
    }

    logger.info('Course deleted', {
      courseId,
      userId: user.id,
      filesDeleted: course.files.length,
    })

    return successResponse({
      message: 'Course deleted successfully',
    })
  } catch (error: any) {
    logger.error('Failed to delete course', { error })

    if (error.code) {
      return errorResponse(error.code, error.message, error.status || 500)
    }

    return errorResponse(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Failed to delete course',
      500
    )
  }
}
