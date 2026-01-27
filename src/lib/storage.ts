import { createClient } from '@/lib/supabase/server'

/**
 * Storage utility functions for Supabase Storage
 */

const STORAGE_BUCKET = 'pdfs'

/**
 * Get a signed upload URL for a file
 */
export async function getUploadUrl(
  filePath: string,
  _expiresIn: number = 3600
): Promise<{ url: string; error: Error | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(filePath, {
        upsert: false,
      })

    if (error) throw error

    return { url: data.signedUrl, error: null }
  } catch (error) {
    return { url: '', error: error as Error }
  }
}

/**
 * Get a signed download URL for a file
 */
export async function getDownloadUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<{ url: string; error: Error | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresIn)

    if (error) throw error

    return { url: data.signedUrl, error: null }
  } catch (error) {
    return { url: '', error: error as Error }
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  filePath: string
): Promise<{ error: Error | null }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath])

    if (error) throw error

    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(filePath: string): Promise<{
  size?: number
  mimeType?: string
  error: Error | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop(),
      })

    if (error) throw error

    const file = data?.[0]

    if (!file) {
      throw new Error('File not found')
    }

    return {
      size: file.metadata?.size,
      mimeType: file.metadata?.mimetype,
      error: null,
    }
  } catch (error) {
    return { error: error as Error }
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  const { error } = await getFileMetadata(filePath)
  return !error
}
