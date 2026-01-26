import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { getCurrentUser, createAuthError, createAuthSuccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { AUTH_ERROR_CODES, COURSE_ERROR_CODES } from '@/types'
import { requireCsrf } from '@/lib/csrf'
import { apiRateLimiter, getRateLimitKey } from '@/lib/rate-limit'

const uuidSchema = z.string().uuid()

const updateCourseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Course name is required')
    .max(50, 'Course name must be 50 characters or less')
    .optional(),
  school: z
    .string()
    .max(100, 'School name must be 100 characters or less')
    .optional()
    .nullable(),
  term: z
    .string()
    .max(50, 'Term must be 50 characters or less')
    .optional()
    .nullable(),
}).refine(
  (data) => data.name !== undefined || data.school !== undefined || data.term !== undefined,
  { message: 'At least one field must be provided for update' }
)

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.SESSION_EXPIRED, 'Authentication required'),
        { status: 401 }
      )
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
    const rateLimitResult = apiRateLimiter(getRateLimitKey(ip, user.id, 'get-course'))
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.RATE_LIMITED, 'Too many requests'),
        { status: 429 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        createAuthError(COURSE_ERROR_CODES.NOT_FOUND, 'Course not found'),
        { status: 404 }
      )
    }

    // Query with ownership check in single query for efficiency
    const course = await prisma.course.findFirst({
      where: { id, userId: user.id },
      include: {
        files: true,
        _count: {
          select: { files: true },
        },
      },
    })

    if (!course) {
      return NextResponse.json(
        createAuthError(COURSE_ERROR_CODES.NOT_FOUND, 'Course not found'),
        { status: 404 }
      )
    }

    return NextResponse.json(createAuthSuccess({ course }))
  } catch (error) {
    logger.error('Get course error', error, { action: 'get-course' })
    return NextResponse.json(
      createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch course'),
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // CSRF validation
    const csrfError = await requireCsrf(request)
    if (csrfError) return csrfError

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.SESSION_EXPIRED, 'Authentication required'),
        { status: 401 }
      )
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
    const rateLimitResult = apiRateLimiter(getRateLimitKey(ip, user.id, 'update-course'))
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.RATE_LIMITED, 'Too many requests'),
        { status: 429 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        createAuthError(COURSE_ERROR_CODES.NOT_FOUND, 'Course not found'),
        { status: 404 }
      )
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        createAuthError(COURSE_ERROR_CODES.VALIDATION_ERROR, 'Invalid request body'),
        { status: 400 }
      )
    }

    const result = updateCourseSchema.safeParse(body)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return NextResponse.json(
        createAuthError(COURSE_ERROR_CODES.VALIDATION_ERROR, firstError.message),
        { status: 400 }
      )
    }

    // Check if course exists and belongs to user
    const existingCourse = await prisma.course.findFirst({
      where: { id, userId: user.id },
    })

    if (!existingCourse) {
      return NextResponse.json(
        createAuthError(COURSE_ERROR_CODES.NOT_FOUND, 'Course not found'),
        { status: 404 }
      )
    }

    const { name, school, term } = result.data

    // Check for duplicate course name (excluding current course)
    if (name && name !== existingCourse.name) {
      const duplicateCourse = await prisma.course.findUnique({
        where: {
          userId_name: {
            userId: user.id,
            name,
          },
        },
      })

      if (duplicateCourse) {
        return NextResponse.json(
          createAuthError(
            COURSE_ERROR_CODES.NAME_EXISTS,
            'A course with this name already exists'
          ),
          { status: 409 }
        )
      }
    }

    // Build update data
    const updateData: { name?: string; school?: string | null; term?: string | null } = {}
    if (name !== undefined) updateData.name = name
    if (school !== undefined) updateData.school = school
    if (term !== undefined) updateData.term = term

    // Update the course with ownership check in where clause (defense-in-depth)
    const course = await prisma.course.update({
      where: { id, userId: user.id },
      data: updateData,
      include: {
        _count: {
          select: { files: true },
        },
      },
    })

    return NextResponse.json(createAuthSuccess({ course }))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle record not found (race condition with concurrent delete)
      if (error.code === 'P2025') {
        return NextResponse.json(
          createAuthError(COURSE_ERROR_CODES.NOT_FOUND, 'Course not found'),
          { status: 404 }
        )
      }
      // Handle unique constraint violation (race condition with duplicate name)
      if (error.code === 'P2002') {
        return NextResponse.json(
          createAuthError(COURSE_ERROR_CODES.NAME_EXISTS, 'A course with this name already exists'),
          { status: 409 }
        )
      }
    }

    logger.error('Update course error', error, { action: 'update-course' })
    return NextResponse.json(
      createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to update course'),
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // CSRF validation
    const csrfError = await requireCsrf(request)
    if (csrfError) return csrfError

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.SESSION_EXPIRED, 'Authentication required'),
        { status: 401 }
      )
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
    const rateLimitResult = apiRateLimiter(getRateLimitKey(ip, user.id, 'delete-course'))
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.RATE_LIMITED, 'Too many requests'),
        { status: 429 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        createAuthError(COURSE_ERROR_CODES.NOT_FOUND, 'Course not found'),
        { status: 404 }
      )
    }

    // Check if course exists and belongs to user
    const existingCourse = await prisma.course.findFirst({
      where: { id, userId: user.id },
    })

    if (!existingCourse) {
      return NextResponse.json(
        createAuthError(COURSE_ERROR_CODES.NOT_FOUND, 'Course not found'),
        { status: 404 }
      )
    }

    // TODO: Clean up R2 storage for associated files before deletion
    // Files' storagePath points to R2 objects that need to be deleted
    // Consider using a background job (Trigger.dev) for cleanup

    // Delete the course with ownership check in where clause (defense-in-depth)
    // Files will be cascade deleted by Prisma
    await prisma.course.delete({
      where: { id, userId: user.id },
    })

    return NextResponse.json(createAuthSuccess({ deleted: true }))
  } catch (error) {
    // Handle record not found (race condition with concurrent delete)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        createAuthError(COURSE_ERROR_CODES.NOT_FOUND, 'Course not found'),
        { status: 404 }
      )
    }

    logger.error('Delete course error', error, { action: 'delete-course' })
    return NextResponse.json(
      createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to delete course'),
      { status: 500 }
    )
  }
}
