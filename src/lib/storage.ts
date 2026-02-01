/**
 * Supabase Storage Helpers
 *
 * Functions for managing PDF files in Supabase Storage
 */

import { createAdminClient } from './supabase/server'

const BUCKET_NAME = 'pdfs'
const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const SIGNED_URL_EXPIRY = 60 * 60 // 1 hour

/**
 * Storage structure:
 * pdfs/
 *   {user_id}/
 *     {file_id}.pdf
 */

/**
 * Generate a presigned upload URL for a PDF file
 */
export async function generateUploadUrl(userId: string, fileId: string): Promise<string> {
  const supabase = createAdminClient()
  const filePath = `${userId}/${fileId}.pdf`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(filePath, {
      upsert: false, // Don't allow overwriting existing files
    })

  if (error) {
    throw new Error(`Failed to generate upload URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Generate a presigned download URL for a PDF file
 */
export async function generateDownloadUrl(userId: string, fileId: string): Promise<string> {
  const supabase = createAdminClient()
  const filePath = `${userId}/${fileId}.pdf`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY)

  if (error) {
    throw new Error(`Failed to generate download URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Delete a PDF file from storage
 */
export async function deleteFile(userId: string, fileId: string): Promise<void> {
  const supabase = createAdminClient()
  const filePath = `${userId}/${fileId}.pdf`

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath])

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}

/**
 * Get file metadata from storage
 */
export async function getFileMetadata(userId: string, fileId: string) {
  const supabase = createAdminClient()
  const filePath = `${userId}/${fileId}.pdf`

  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(userId, {
    search: `${fileId}.pdf`,
  })

  if (error) {
    throw new Error(`Failed to get file metadata: ${error.message}`)
  }

  return data?.[0] || null
}

/**
 * Get user's total storage usage in bytes
 */
export async function getUserStorageUsage(userId: string): Promise<number> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(userId)

  if (error) {
    throw new Error(`Failed to get storage usage: ${error.message}`)
  }

  return data?.reduce((total: number, file: any) => total + (file.metadata?.size || 0), 0) || 0
}

/**
 * Check if user has enough storage quota
 */
export async function checkStorageQuota(
  userId: string,
  additionalBytes: number
): Promise<boolean> {
  const currentUsage = await getUserStorageUsage(userId)
  const maxStorage = 5 * 1024 * 1024 * 1024 // 5GB

  return currentUsage + additionalBytes <= maxStorage
}

/**
 * Validate file before upload
 */
export interface FileValidationError {
  code: string
  message: string
}

export async function validateFileForUpload(
  userId: string,
  fileName: string,
  fileSizeBytes: number,
  pageCount: number
): Promise<FileValidationError | null> {
  // Check file size
  if (fileSizeBytes > MAX_FILE_SIZE) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `File size must be less than 500MB (got ${Math.round(fileSizeBytes / 1024 / 1024)}MB)`,
    }
  }

  // Check page count
  if (pageCount > 500) {
    return {
      code: 'FILE_TOO_MANY_PAGES',
      message: `File must have less than 500 pages (got ${pageCount} pages)`,
    }
  }

  // Check storage quota
  const hasQuota = await checkStorageQuota(userId, fileSizeBytes)
  if (!hasQuota) {
    return {
      code: 'STORAGE_LIMIT_REACHED',
      message: 'You have reached your 5GB storage limit',
    }
  }

  return null
}
