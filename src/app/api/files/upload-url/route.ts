import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  handleError,
  HTTP_STATUS,
} from '@/lib/api-response'
import { ERROR_CODES, FILE_LIMITS } from '@/lib/constants'
import prisma from '@/lib/prisma'
import { getUploadUrl } from '@/lib/storage'
import { generateStoragePath, isValidPdfType } from '@/lib/pdf'
import { logger } from '@/lib/logger'
import { apiRateLimit } from '@/lib/rate-limit'
import { requireCsrfToken } from '@/lib/csrf-server'

/**
 * FILE-001: Generate presigned upload URL for file upload
 *
 * POST /api/files/upload-url
 *
 * Request body:
 * {
 *   fileName: string
 *   fileSize: number (bytes)
 *   fileType: string (MIME type)
 *   courseId: string
 * }
 *
 * Response:
 * {
 *   uploadUrl: string (presigned URL)
 *   fileId: string (File record ID)
 *   storagePath: string
 *   expiresAt: string (ISO timestamp)
 * }
 */

const uploadUrlSchema = z.object({
  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name too long'),
  fileSize: z.number().positive('File size must be positive'),
  fileType: z.string().min(1, 'File type is required'),
  courseId: z.string().cuid('Invalid course ID'),
})

export async function POST(request: NextRequest) {
  try {
    // 1. CSRF protection
    try {
      await requireCsrfToken(request)
    } catch {
      return errorResponse(
        ERROR_CODES.CSRF_TOKEN_INVALID,
        'Invalid CSRF token',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 2. Authentication
    const user = await requireAuth()

    // 3. Rate limiting
    const rateLimit = await apiRateLimit(user.id)
    if (!rateLimit.allowed) {
      return errorResponse(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many requests. Please try again later.',
        HTTP_STATUS.TOO_MANY_REQUESTS
      )
    }

    // 4. Parse and validate request body
    const body = await request.json()
    const validation = uploadUrlSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request data',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const { fileName, fileSize, fileType, courseId } = validation.data

    // 5. Validate file type
    if (!isValidPdfType(fileType)) {
      return errorResponse(
        ERROR_CODES.FILE_INVALID_TYPE,
        'Only PDF files are allowed',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 6. Validate file size
    if (fileSize > FILE_LIMITS.MAX_FILE_SIZE) {
      return errorResponse(
        ERROR_CODES.FILE_TOO_LARGE,
        `File size exceeds maximum allowed size of ${FILE_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 7. Check course ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { userId: true },
    })

    if (!course) {
      return errorResponse(
        ERROR_CODES.COURSE_NOT_FOUND,
        'Course not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    if (course.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.COURSE_FORBIDDEN,
        'You do not have permission to upload files to this course',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 8. Check file count limit, storage quota, and create file record in a transaction
    // This prevents race conditions where multiple concurrent requests could exceed limits
    const result = await prisma.$transaction(
      async (tx) => {
        // Check file count limit for course
        const fileCount = await tx.file.count({
          where: { courseId },
        })

        if (fileCount >= FILE_LIMITS.MAX_FILES_PER_COURSE) {
          throw new Error(
            `FILE_COUNT_LIMIT_REACHED:Course has reached maximum file limit of ${FILE_LIMITS.MAX_FILES_PER_COURSE} files`
          )
        }

        // Check storage quota for user
        const totalStorage = await tx.file.aggregate({
          where: {
            course: {
              userId: user.id,
            },
          },
          _sum: {
            fileSize: true,
          },
        })

        const currentStorage = Number(totalStorage._sum.fileSize || 0)
        if (currentStorage + fileSize > FILE_LIMITS.MAX_STORAGE_PER_USER) {
          throw new Error(
            `STORAGE_LIMIT_REACHED:Storage limit of ${FILE_LIMITS.MAX_STORAGE_PER_USER / 1024 / 1024 / 1024}GB exceeded`
          )
        }

        // Check for duplicate file name in course
        const existingFile = await tx.file.findUnique({
          where: {
            courseId_name: {
              courseId,
              name: fileName,
            },
          },
        })

        if (existingFile) {
          throw new Error(
            'FILE_DUPLICATE_NAME:A file with this name already exists in the course'
          )
        }

        // Generate storage path
        const storagePath = generateStoragePath(user.id, courseId, fileName)

        // Get presigned upload URL from Supabase
        const { url: uploadUrl, error: storageError } = await getUploadUrl(
          storagePath,
          FILE_LIMITS.UPLOAD_URL_EXPIRY
        )

        if (storageError || !uploadUrl) {
          logger.error('Failed to generate upload URL', { storageError })
          throw new Error('INTERNAL_SERVER_ERROR:Failed to generate upload URL')
        }

        // Create File record with UPLOADING status
        const file = await tx.file.create({
          data: {
            courseId,
            name: fileName,
            fileSize: BigInt(fileSize),
            storagePath,
            status: 'UPLOADING',
            type: 'LECTURE', // Default type
            structureStatus: 'PENDING',
          },
        })

        return { file, uploadUrl, storagePath }
      },
      {
        isolationLevel: 'Serializable', // Highest isolation level to prevent race conditions
      }
    )

    const { file, uploadUrl, storagePath } = result

    // 9. Return upload URL and file metadata
    const expiresAt = new Date(
      Date.now() + FILE_LIMITS.UPLOAD_URL_EXPIRY * 1000
    )

    return successResponse(
      {
        uploadUrl,
        fileId: file.id,
        storagePath,
        expiresAt: expiresAt.toISOString(),
      },
      HTTP_STATUS.CREATED
    )
  } catch (error) {
    // Handle transaction errors with custom error codes
    if (error instanceof Error && error.message.includes(':')) {
      const parts = error.message.split(':', 2)
      const code = parts[0]
      const message = parts[1] || 'Unknown error'

      if (code === 'FILE_COUNT_LIMIT_REACHED') {
        return errorResponse(
          ERROR_CODES.FILE_COUNT_LIMIT_REACHED,
          message,
          HTTP_STATUS.BAD_REQUEST
        )
      }

      if (code === 'STORAGE_LIMIT_REACHED') {
        return errorResponse(
          ERROR_CODES.STORAGE_LIMIT_REACHED,
          message,
          HTTP_STATUS.BAD_REQUEST
        )
      }

      if (code === 'FILE_DUPLICATE_NAME') {
        return errorResponse(
          ERROR_CODES.FILE_DUPLICATE_NAME,
          message,
          HTTP_STATUS.CONFLICT
        )
      }

      if (code === 'INTERNAL_SERVER_ERROR') {
        return errorResponse(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          message,
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        )
      }
    }

    logger.error('Error in upload-url route', error)
    return handleError(error)
  }
}
