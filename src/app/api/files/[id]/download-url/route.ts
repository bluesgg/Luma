import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, createAuthError, createAuthSuccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { AUTH_ERROR_CODES, FILE_ERROR_CODES } from '@/types'
import { apiRateLimiter, getRateLimitKey } from '@/lib/rate-limit'
import { createSignedDownloadUrl } from '@/lib/storage'

const uuidSchema = z.string().uuid()

// URL expires in 1 hour
const URL_EXPIRY_SECONDS = 3600

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
    const rateLimitResult = apiRateLimiter(getRateLimitKey(ip, user.id, 'get-download-url'))
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.RATE_LIMITED, 'Too many requests'),
        { status: 429 }
      )
    }

    const { id: fileId } = await context.params

    // Validate UUID format
    if (!uuidSchema.safeParse(fileId).success) {
      return NextResponse.json(
        createAuthError(FILE_ERROR_CODES.NOT_FOUND, 'File not found'),
        { status: 404 }
      )
    }

    // Find file with ownership check
    const file = await prisma.file.findFirst({
      where: { id: fileId, userId: user.id },
    })

    if (!file) {
      return NextResponse.json(
        createAuthError(FILE_ERROR_CODES.NOT_FOUND, 'File not found'),
        { status: 404 }
      )
    }

    // Check if file is ready for download
    if (file.status !== 'ready') {
      return NextResponse.json(
        createAuthError(FILE_ERROR_CODES.VALIDATION_ERROR, 'File is not ready for download'),
        { status: 400 }
      )
    }

    // Validate storage path exists
    if (!file.storagePath) {
      logger.error('File record missing storage path', { fileId, userId: user.id })
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'File configuration error'),
        { status: 500 }
      )
    }

    // Generate signed download URL
    const downloadUrl = await createSignedDownloadUrl(file.storagePath, URL_EXPIRY_SECONDS)

    if (!downloadUrl) {
      return NextResponse.json(
        createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to generate download URL'),
        { status: 500 }
      )
    }

    return NextResponse.json(
      createAuthSuccess({
        downloadUrl,
        expiresIn: URL_EXPIRY_SECONDS,
      })
    )
  } catch (error) {
    logger.error('Get download URL error', error, { action: 'get-download-url' })
    return NextResponse.json(
      createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to generate download URL'),
      { status: 500 }
    )
  }
}
