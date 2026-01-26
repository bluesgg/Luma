import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, createAuthError, createAuthSuccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { STORAGE } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { AUTH_ERROR_CODES, COURSE_ERROR_CODES } from '@/types'
import { requireCsrf } from '@/lib/csrf'
import { apiRateLimiter, getRateLimitKey } from '@/lib/rate-limit'

const createCourseSchema = z.object({
  name: z
    .string()
    .min(1, 'Course name is required')
    .max(50, 'Course name must be 50 characters or less'),
  school: z
    .string()
    .max(100, 'School name must be 100 characters or less')
    .optional(),
  term: z
    .string()
    .max(50, 'Term must be 50 characters or less')
    .optional(),
})

export async function GET(request: NextRequest) {
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
    const rateLimitResult = apiRateLimiter(getRateLimitKey(ip, user.id, 'get-courses'))
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.RATE_LIMITED, 'Too many requests'),
        { status: 429 }
      )
    }

    const courses = await prisma.course.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { files: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(createAuthSuccess({ courses }))
  } catch (error) {
    logger.error('Get courses error', error, { action: 'get-courses' })
    return NextResponse.json(
      createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch courses'),
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const result = createCourseSchema.safeParse(body)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return NextResponse.json(
        createAuthError(COURSE_ERROR_CODES.VALIDATION_ERROR, firstError.message),
        { status: 400 }
      )
    }

    const { name, school, term } = result.data

    // Check course limit (max 6 per user)
    const courseCount = await prisma.course.count({
      where: { userId: user.id },
    })

    if (courseCount >= STORAGE.MAX_COURSES_PER_USER) {
      return NextResponse.json(
        createAuthError(
          COURSE_ERROR_CODES.LIMIT_EXCEEDED,
          `You can only create up to ${STORAGE.MAX_COURSES_PER_USER} courses`
        ),
        { status: 400 }
      )
    }

    // Check for duplicate course name
    const existingCourse = await prisma.course.findUnique({
      where: {
        userId_name: {
          userId: user.id,
          name,
        },
      },
    })

    if (existingCourse) {
      return NextResponse.json(
        createAuthError(
          COURSE_ERROR_CODES.NAME_EXISTS,
          'A course with this name already exists'
        ),
        { status: 409 }
      )
    }

    // Create the course
    const course = await prisma.course.create({
      data: {
        userId: user.id,
        name,
        school: school ?? null,
        term: term ?? null,
      },
      include: {
        _count: {
          select: { files: true },
        },
      },
    })

    return NextResponse.json(createAuthSuccess({ course }), { status: 201 })
  } catch (error) {
    logger.error('Create course error', error, { action: 'create-course' })
    return NextResponse.json(
      createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to create course'),
      { status: 500 }
    )
  }
}
