import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, createAuthError, createAuthSuccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { STORAGE } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { AUTH_ERROR_CODES, FILE_ERROR_CODES, COURSE_ERROR_CODES } from '@/types'
import { requireCsrf } from '@/lib/csrf'
import { apiRateLimiter, getRateLimitKey } from '@/lib/rate-limit'

const createFileSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  name: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name must be 255 characters or less'),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(STORAGE.MAX_FILE_SIZE, `File size must be ${STORAGE.MAX_FILE_SIZE / 1024 / 1024}MB or less`),
  pageCount: z
    .number()
    .int()
    .positive()
    .max(STORAGE.MAX_PAGE_COUNT, `File must have ${STORAGE.MAX_PAGE_COUNT} pages or less`)
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
    const rateLimitResult = apiRateLimiter(getRateLimitKey(ip, user.id, 'get-files'))
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.RATE_LIMITED, 'Too many requests'),
        { status: 429 }
      )
    }

    // Get optional courseId filter from query params
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    // Build where clause
    const where: { userId: string; courseId?: string } = { userId: user.id }
    if (courseId) {
      // Verify course ownership
      const course = await prisma.course.findFirst({
        where: { id: courseId, userId: user.id },
      })
      if (!course) {
        return NextResponse.json(
          createAuthError(COURSE_ERROR_CODES.NOT_FOUND, 'Course not found'),
          { status: 404 }
        )
      }
      where.courseId = courseId
    }

    const files = await prisma.file.findMany({
      where,
      include: {
        course: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(createAuthSuccess({ files }))
  } catch (error) {
    logger.error('Get files error', error, { action: 'get-files' })
    return NextResponse.json(
      createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch files'),
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
        createAuthError(FILE_ERROR_CODES.VALIDATION_ERROR, 'Invalid request body'),
        { status: 400 }
      )
    }

    const result = createFileSchema.safeParse(body)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return NextResponse.json(
        createAuthError(FILE_ERROR_CODES.VALIDATION_ERROR, firstError.message),
        { status: 400 }
      )
    }

    const { courseId, name, fileSize, pageCount } = result.data

    // Verify course ownership and get file count
    const course = await prisma.course.findFirst({
      where: { id: courseId, userId: user.id },
      include: {
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

    // Check file limit per course
    if (course._count.files >= STORAGE.MAX_FILES_PER_COURSE) {
      return NextResponse.json(
        createAuthError(
          FILE_ERROR_CODES.LIMIT_EXCEEDED,
          `Maximum ${STORAGE.MAX_FILES_PER_COURSE} files per course`
        ),
        { status: 400 }
      )
    }

    // Check for duplicate file name in course
    const existingFile = await prisma.file.findUnique({
      where: {
        courseId_name: {
          courseId,
          name,
        },
      },
    })

    if (existingFile) {
      return NextResponse.json(
        createAuthError(
          FILE_ERROR_CODES.NAME_EXISTS,
          'A file with this name already exists in this course'
        ),
        { status: 409 }
      )
    }

    // Check total user storage
    const totalStorage = await prisma.file.aggregate({
      where: { userId: user.id },
      _sum: { fileSize: true },
    })

    const currentStorage = Number(totalStorage._sum.fileSize ?? 0)
    if (currentStorage + fileSize > STORAGE.MAX_USER_STORAGE) {
      return NextResponse.json(
        createAuthError(
          FILE_ERROR_CODES.STORAGE_EXCEEDED,
          `Storage limit exceeded. Maximum ${STORAGE.MAX_USER_STORAGE / 1024 / 1024 / 1024}GB allowed`
        ),
        { status: 400 }
      )
    }

    // Create the file record
    const file = await prisma.file.create({
      data: {
        userId: user.id,
        courseId,
        name,
        fileSize: BigInt(fileSize),
        pageCount: pageCount ?? null,
        status: 'uploading',
        type: 'lecture',
      },
      include: {
        course: {
          select: { id: true, name: true },
        },
      },
    })

    // Convert BigInt to number for JSON serialization
    const fileResponse = {
      ...file,
      fileSize: Number(file.fileSize),
    }

    return NextResponse.json(createAuthSuccess({ file: fileResponse }), { status: 201 })
  } catch (error) {
    logger.error('Create file error', error, { action: 'create-file' })
    return NextResponse.json(
      createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to create file'),
      { status: 500 }
    )
  }
}
