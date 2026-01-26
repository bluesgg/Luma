import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, createAuthError, createAuthSuccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { AUTH_ERROR_CODES, COURSE_ERROR_CODES } from '@/types'
import { apiRateLimiter, getRateLimitKey } from '@/lib/rate-limit'

const uuidSchema = z.string().uuid()

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
    const rateLimitResult = apiRateLimiter(getRateLimitKey(ip, user.id, 'get-course-files'))
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.RATE_LIMITED, 'Too many requests'),
        { status: 429 }
      )
    }

    const { id: courseId } = await context.params

    // Validate UUID format
    if (!uuidSchema.safeParse(courseId).success) {
      return NextResponse.json(
        createAuthError(COURSE_ERROR_CODES.NOT_FOUND, 'Course not found'),
        { status: 404 }
      )
    }

    // Check course ownership
    const course = await prisma.course.findFirst({
      where: { id: courseId, userId: user.id },
    })

    if (!course) {
      return NextResponse.json(
        createAuthError(COURSE_ERROR_CODES.NOT_FOUND, 'Course not found'),
        { status: 404 }
      )
    }

    // Get files for the course
    const files = await prisma.file.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        pageCount: true,
        fileSize: true,
        isScanned: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Convert BigInt to number for JSON serialization
    const serializedFiles = files.map((file) => ({
      ...file,
      fileSize: file.fileSize ? Number(file.fileSize) : null,
    }))

    return NextResponse.json(createAuthSuccess({ files: serializedFiles }))
  } catch (error) {
    logger.error('Get course files error', error, { action: 'get-course-files' })
    return NextResponse.json(
      createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch files'),
      { status: 500 }
    )
  }
}
