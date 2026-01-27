import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  handleError,
  HTTP_STATUS,
} from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * FILE-003: Get all files for a course
 *
 * GET /api/courses/[id]/files
 *
 * Response:
 * {
 *   files: Array<{
 *     id: string
 *     name: string
 *     type: string
 *     pageCount: number | null
 *     fileSize: string
 *     isScanned: boolean
 *     status: string
 *     structureStatus: string
 *     createdAt: string
 *     updatedAt: string
 *   }>
 * }
 */

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    // 1. Authentication
    const user = await requireAuth()

    // 2. Get course ID from params
    const params = await context.params
    const courseId = params.id

    // 3. Validate course ownership
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
        'You do not have permission to access this course',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 4. Get all files for the course
    const files = await prisma.file.findMany({
      where: { courseId },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        type: true,
        pageCount: true,
        fileSize: true,
        isScanned: true,
        status: true,
        structureStatus: true,
        structureError: true,
        createdAt: true,
        updatedAt: true,
        extractedAt: true,
      },
    })

    // 5. Format response (convert BigInt to string)
    const formattedFiles = files.map((file) => ({
      id: file.id,
      name: file.name,
      type: file.type,
      pageCount: file.pageCount,
      fileSize: file.fileSize.toString(),
      isScanned: file.isScanned,
      status: file.status,
      structureStatus: file.structureStatus,
      structureError: file.structureError,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
      extractedAt: file.extractedAt?.toISOString() || null,
    }))

    return successResponse(
      {
        files: formattedFiles,
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    logger.error('Error in courses/[id]/files route', error)
    return handleError(error)
  }
}
