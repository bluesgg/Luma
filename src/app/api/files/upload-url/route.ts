import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, createAuthError, createAuthSuccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { AUTH_ERROR_CODES, COURSE_ERROR_CODES, FILE_ERROR_CODES, type FileErrorCode } from '@/types'
import { requireCsrf } from '@/lib/csrf'
import { apiRateLimiter, getRateLimitKey } from '@/lib/rate-limit'
import { checkStorageLimits, buildStoragePath, createSignedUploadUrl } from '@/lib/storage'

const uploadUrlSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name must be 255 characters or less')
    .refine((name) => name.toLowerCase().endsWith('.pdf'), {
      message: 'Only PDF files are allowed',
    })
    // Security: Prevent path traversal attacks
    .refine((name) => !name.includes('..'), {
      message: 'Invalid file name',
    })
    .refine((name) => !name.includes('/') && !name.includes('\\'), {
      message: 'Invalid file name',
    })
    .refine((name) => !name.includes('\0'), {
      message: 'Invalid file name',
    }),
  fileSize: z.number().int().positive('File size must be positive'),
})

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

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
    const rateLimitResult = apiRateLimiter(getRateLimitKey(ip, user.id, 'upload-url'))
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.RATE_LIMITED, 'Too many requests'),
        { status: 429 }
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

    const result = uploadUrlSchema.safeParse(body)
    if (!result.success) {
      const firstError = result.error.issues[0]
      // Map Zod errors to appropriate error codes
      if (firstError.path[0] === 'fileName' && firstError.message === 'Only PDF files are allowed') {
        return NextResponse.json(
          createAuthError(FILE_ERROR_CODES.INVALID_TYPE, 'Only PDF files are allowed'),
          { status: 400 }
        )
      }
      return NextResponse.json(
        createAuthError(FILE_ERROR_CODES.VALIDATION_ERROR, firstError.message),
        { status: 400 }
      )
    }

    const { courseId, fileName, fileSize } = result.data

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

    // Check storage limits
    const limitCheck = await checkStorageLimits(user.id, courseId, fileSize, fileName)
    if (!limitCheck.allowed && limitCheck.error) {
      const statusCode = limitCheck.error.code === FILE_ERROR_CODES.NAME_EXISTS ? 409 : 400
      return NextResponse.json(
        createAuthError(limitCheck.error.code as FileErrorCode, limitCheck.error.message),
        { status: statusCode }
      )
    }

    // Create file record with uploading status
    const file = await prisma.file.create({
      data: {
        courseId,
        userId: user.id,
        name: fileName,
        type: 'lecture',
        fileSize: BigInt(fileSize),
        status: 'uploading',
        storagePath: '', // Will be set after we generate the path
      },
    })

    // Generate storage path and signed URL
    const storagePath = buildStoragePath(user.id, courseId, file.id)
    const uploadResult = await createSignedUploadUrl(storagePath)

    if (!uploadResult) {
      // Clean up the file record if URL generation fails
      await prisma.file.delete({ where: { id: file.id } })
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to generate upload URL'),
        { status: 500 }
      )
    }

    // Update file with storage path
    await prisma.file.update({
      where: { id: file.id },
      data: { storagePath },
    })

    return NextResponse.json(
      createAuthSuccess({
        fileId: file.id,
        uploadUrl: uploadResult.signedUrl,
        token: uploadResult.token,
      })
    )
  } catch (error) {
    logger.error('Upload URL generation error', error, { action: 'get-upload-url' })
    return NextResponse.json(
      createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to generate upload URL'),
      { status: 500 }
    )
  }
}
