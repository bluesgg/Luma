import { createServiceClient } from '@/lib/supabase/server'
import { storageConfig } from '@/lib/env'
import { STORAGE } from '@/lib/constants'
import { prisma } from '@/lib/prisma'
import { FILE_ERROR_CODES } from '@/types'

/**
 * Storage path format: {userId}/{courseId}/{fileId}.pdf
 */
export function buildStoragePath(userId: string, courseId: string, fileId: string): string {
  return `${userId}/${courseId}/${fileId}.pdf`
}

/**
 * Check if a file would exceed storage limits
 */
export async function checkStorageLimits(
  userId: string,
  courseId: string,
  fileSize: number,
  fileName: string
): Promise<{ allowed: boolean; error?: { code: string; message: string } }> {
  // Check single file size limit (200MB)
  if (fileSize > STORAGE.MAX_FILE_SIZE) {
    return {
      allowed: false,
      error: {
        code: FILE_ERROR_CODES.TOO_LARGE,
        message: `File size exceeds maximum allowed (${STORAGE.MAX_FILE_SIZE / 1024 / 1024}MB)`,
      },
    }
  }

  // Check files per course limit (30)
  const courseFileCount = await prisma.file.count({
    where: { courseId },
  })
  if (courseFileCount >= STORAGE.MAX_FILES_PER_COURSE) {
    return {
      allowed: false,
      error: {
        code: FILE_ERROR_CODES.LIMIT_EXCEEDED,
        message: `Course has reached maximum file limit (${STORAGE.MAX_FILES_PER_COURSE})`,
      },
    }
  }

  // Check user total storage limit (5GB)
  const userStorageUsed = await prisma.file.aggregate({
    where: { userId },
    _sum: { fileSize: true },
  })
  const totalUsed = Number(userStorageUsed._sum.fileSize ?? 0)
  if (totalUsed + fileSize > STORAGE.MAX_USER_STORAGE) {
    return {
      allowed: false,
      error: {
        code: FILE_ERROR_CODES.STORAGE_EXCEEDED,
        message: `Storage quota exceeded (${STORAGE.MAX_USER_STORAGE / 1024 / 1024 / 1024}GB limit)`,
      },
    }
  }

  // Check duplicate file name in same course
  const existingFile = await prisma.file.findUnique({
    where: {
      courseId_name: {
        courseId,
        name: fileName,
      },
    },
  })
  if (existingFile) {
    return {
      allowed: false,
      error: {
        code: FILE_ERROR_CODES.NAME_EXISTS,
        message: 'A file with this name already exists in this course',
      },
    }
  }

  return { allowed: true }
}

/**
 * Generate a signed upload URL for direct browser upload
 * URL expires in 1 hour
 */
export async function createSignedUploadUrl(
  storagePath: string
): Promise<{ signedUrl: string; token: string } | null> {
  const supabase = createServiceClient()
  const bucket = storageConfig.bucket

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath)

  if (error || !data) {
    return null
  }

  return {
    signedUrl: data.signedUrl,
    token: data.token,
  }
}

/**
 * Generate a signed download URL
 * URL expires in 1 hour (3600 seconds)
 */
export async function createSignedDownloadUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const supabase = createServiceClient()
  const bucket = storageConfig.bucket

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn)

  if (error || !data) {
    return null
  }

  return data.signedUrl
}

/**
 * Delete a file from storage
 */
export async function deleteStorageFile(storagePath: string): Promise<boolean> {
  const supabase = createServiceClient()
  const bucket = storageConfig.bucket

  const { error } = await supabase.storage.from(bucket).remove([storagePath])

  return !error
}

/**
 * Check if a file exists in storage
 */
export async function fileExistsInStorage(storagePath: string): Promise<boolean> {
  const supabase = createServiceClient()
  const bucket = storageConfig.bucket

  // Try to get file metadata
  const { data, error } = await supabase.storage.from(bucket).list(
    storagePath.split('/').slice(0, -1).join('/'),
    {
      limit: 1,
      search: storagePath.split('/').pop(),
    }
  )

  if (error || !data) {
    return false
  }

  const fileName = storagePath.split('/').pop()
  return data.some((file) => file.name === fileName)
}

/**
 * Download a file from storage (for server-side processing)
 */
export async function downloadFile(storagePath: string): Promise<ArrayBuffer | null> {
  const supabase = createServiceClient()
  const bucket = storageConfig.bucket

  const { data, error } = await supabase.storage.from(bucket).download(storagePath)

  if (error || !data) {
    return null
  }

  return await data.arrayBuffer()
}

/**
 * Detect if a PDF is a scanned document (placeholder implementation)
 * In a real implementation, this would use pdf.js to check text content
 */
export async function detectScannedPdf(_pdfBuffer: ArrayBuffer): Promise<boolean> {
  // Placeholder: MVP returns false (not scanned)
  // Full implementation would sample pages and check text content ratio
  return false
}

/**
 * Get PDF page count (placeholder implementation)
 * In a real implementation, this would use pdf.js
 */
export async function getPdfPageCount(_pdfBuffer: ArrayBuffer): Promise<number | null> {
  // Placeholder: MVP returns null (unknown)
  // Full implementation would parse PDF and count pages
  return null
}
