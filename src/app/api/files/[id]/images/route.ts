/**
 * GET /api/files/:id/images
 * Get extracted images for a file with signed URLs
 */

import type { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  handleError,
  HTTP_STATUS,
} from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateSignedUrlBatch } from '@/lib/r2'
import { logger } from '@/lib/logger'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const params = await context.params
    const fileId = params.id

    // Parse query params
    const { searchParams } = new URL(request.url)
    const pageNumber = searchParams.get('page')
      ? parseInt(searchParams.get('page')!)
      : null

    // Get file
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        course: true,
      },
    })

    if (!file) {
      return errorResponse(
        ERROR_CODES.FILE_NOT_FOUND,
        'File not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // Check ownership
    if (file.course.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.FILE_FORBIDDEN,
        'You do not have permission to access this file',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // Get images
    const whereClause: any = { fileId }
    if (pageNumber !== null) {
      whereClause.pageNumber = pageNumber
    }

    const images = await prisma.extractedImage.findMany({
      where: whereClause,
      orderBy: [{ pageNumber: 'asc' }, { imageIndex: 'asc' }],
    })

    if (images.length === 0) {
      return successResponse({
        fileId,
        images: [],
        totalImages: 0,
      })
    }

    // Generate signed URLs for all images
    const imagePaths = images.map((img) => img.storagePath)
    const signedUrls = await generateSignedUrlBatch(imagePaths)

    // Map images with signed URLs
    const imagesWithUrls = images.map((img) => ({
      id: img.id,
      pageNumber: img.pageNumber,
      imageIndex: img.imageIndex,
      bbox: img.bbox,
      url: signedUrls[img.storagePath] || null,
      createdAt: img.createdAt,
    }))

    logger.info('Retrieved file images with signed URLs', {
      fileId,
      imageCount: images.length,
      pageNumber,
    })

    return successResponse({
      fileId,
      images: imagesWithUrls,
      totalImages: images.length,
    })
  } catch (error) {
    return handleError(error)
  }
}
