import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, createAuthError, createAuthSuccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { AUTH_ERROR_CODES, FILE_ERROR_CODES } from '@/types'
import { requireCsrf } from '@/lib/csrf'
import { apiRateLimiter, getRateLimitKey } from '@/lib/rate-limit'
import {
  fileExistsInStorage,
  downloadFile,
  detectScannedPdf,
  getPdfPageCount,
} from '@/lib/storage'

const uuidSchema = z.string().uuid()

const confirmSchema = z.object({
  fileId: z.string().min(1, 'File ID is required'),
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
    const rateLimitResult = apiRateLimiter(getRateLimitKey(ip, user.id, 'confirm'))
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

    const result = confirmSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        createAuthError(FILE_ERROR_CODES.VALIDATION_ERROR, result.error.issues[0].message),
        { status: 400 }
      )
    }

    const { fileId } = result.data

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

    // Check if file is in uploading status
    if (file.status !== 'uploading') {
      return NextResponse.json(
        createAuthError(FILE_ERROR_CODES.VALIDATION_ERROR, 'File is not in uploading status'),
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

    // Check if file exists in storage
    const fileExists = await fileExistsInStorage(file.storagePath)
    if (!fileExists) {
      // File upload was not completed - mark as failed
      const updatedFile = await prisma.file.update({
        where: { id: fileId },
        data: { status: 'failed' },
      })

      return NextResponse.json(
        createAuthSuccess({
          file: {
            ...updatedFile,
            fileSize: updatedFile.fileSize ? Number(updatedFile.fileSize) : null,
          },
        })
      )
    }

    // Update status to processing
    await prisma.file.update({
      where: { id: fileId },
      data: { status: 'processing' },
    })

    // Download and process the PDF
    let isScanned = false
    let pageCount: number | null = null

    try {
      const pdfBuffer = await downloadFile(file.storagePath)
      if (pdfBuffer) {
        isScanned = await detectScannedPdf(pdfBuffer)
        pageCount = await getPdfPageCount(pdfBuffer)
      }
    } catch {
      logger.warn('PDF processing error', { fileId })
      // Continue with defaults - don't fail the confirmation
    }

    // Update file to ready status
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'ready',
        isScanned,
        pageCount,
      },
    })

    return NextResponse.json(
      createAuthSuccess({
        file: {
          ...updatedFile,
          fileSize: updatedFile.fileSize ? Number(updatedFile.fileSize) : null,
        },
      })
    )
  } catch (error) {
    logger.error('File confirm error', error, { action: 'confirm-file' })
    return NextResponse.json(
      createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to confirm file upload'),
      { status: 500 }
    )
  }
}
