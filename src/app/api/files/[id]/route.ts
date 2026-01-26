import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, createAuthError, createAuthSuccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { AUTH_ERROR_CODES, FILE_ERROR_CODES } from '@/types'
import { requireCsrf } from '@/lib/csrf'
import { apiRateLimiter, getRateLimitKey } from '@/lib/rate-limit'
import { deleteStorageFile } from '@/lib/storage'

const uuidSchema = z.string().uuid()

interface RouteContext {
  params: Promise<{ id: string }>
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
    const rateLimitResult = apiRateLimiter(getRateLimitKey(ip, user.id, 'delete-file'))
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

    // Delete from storage (best effort - don't fail if storage delete fails)
    if (file.storagePath) {
      const storageDeleted = await deleteStorageFile(file.storagePath)
      if (!storageDeleted) {
        logger.warn('Failed to delete file from storage', { fileId, storagePath: file.storagePath })
      }
    }

    // Delete from database (cascades to AI data)
    await prisma.file.delete({
      where: { id: fileId },
    })

    return NextResponse.json(createAuthSuccess({ deleted: true }))
  } catch (error) {
    logger.error('Delete file error', error, { action: 'delete-file' })
    return NextResponse.json(
      createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to delete file'),
      { status: 500 }
    )
  }
}
