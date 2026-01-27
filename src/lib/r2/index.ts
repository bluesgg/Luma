/**
 * Cloudflare R2 Storage Client
 * Handles image uploads, retrievals, and signed URL generation
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  type PutObjectCommandInput,
  type GetObjectCommandInput,
  type DeleteObjectCommandInput,
  type ListObjectsV2CommandInput,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

/**
 * R2 client configuration
 */
const r2Client = env.R2_ACCOUNT_ID
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null

/**
 * Get R2 bucket name
 */
function getBucketName(): string {
  if (!env.R2_BUCKET_NAME) {
    throw new Error('R2_BUCKET_NAME is not configured')
  }
  return env.R2_BUCKET_NAME
}

/**
 * Ensure R2 is configured
 */
function ensureR2Configured() {
  if (!r2Client) {
    throw new Error(
      'R2 is not configured. Please set R2 environment variables.'
    )
  }
}

/**
 * Generate storage path for extracted image
 */
export function generateImagePath(
  fileId: string,
  pageNumber: number,
  imageIndex: number
): string {
  return `images/${fileId}/${pageNumber}_${imageIndex}.png`
}

/**
 * Upload image to R2
 */
export async function uploadImage(
  path: string,
  imageBuffer: Buffer,
  contentType: string = 'image/png'
): Promise<void> {
  ensureR2Configured()

  const params: PutObjectCommandInput = {
    Bucket: getBucketName(),
    Key: path,
    Body: imageBuffer,
    ContentType: contentType,
  }

  try {
    await r2Client!.send(new PutObjectCommand(params))
    logger.info('Image uploaded to R2', { path })
  } catch (error) {
    logger.error('Failed to upload image to R2', { path, error })
    throw new Error(`Failed to upload image: ${error}`)
  }
}

/**
 * Upload multiple images in batch
 */
export async function uploadImageBatch(
  images: Array<{
    path: string
    buffer: Buffer
    contentType?: string
  }>
): Promise<{ succeeded: string[]; failed: string[] }> {
  const results = await Promise.allSettled(
    images.map((img) => uploadImage(img.path, img.buffer, img.contentType))
  )

  const succeeded: string[] = []
  const failed: string[] = []

  results.forEach((result, index) => {
    const image = images[index]
    if (!image) return

    if (result.status === 'fulfilled') {
      succeeded.push(image.path)
    } else {
      failed.push(image.path)
      logger.error('Batch upload failed for image', {
        path: image.path,
        error: result.reason,
      })
    }
  })

  return { succeeded, failed }
}

/**
 * Get image from R2 (returns raw buffer)
 */
export async function getImage(path: string): Promise<Buffer> {
  ensureR2Configured()

  const params: GetObjectCommandInput = {
    Bucket: getBucketName(),
    Key: path,
  }

  try {
    const response = await r2Client!.send(new GetObjectCommand(params))

    if (!response.Body) {
      throw new Error('No body in response')
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    // @ts-expect-error - Body is a stream
    for await (const chunk of response.Body) {
      chunks.push(chunk)
    }

    return Buffer.concat(chunks)
  } catch (error) {
    logger.error('Failed to get image from R2', { path, error })
    throw new Error(`Failed to get image: ${error}`)
  }
}

/**
 * Generate signed URL for image access
 */
export async function generateSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  ensureR2Configured()

  const params: GetObjectCommandInput = {
    Bucket: getBucketName(),
    Key: path,
  }

  try {
    const command = new GetObjectCommand(params)
    const signedUrl = await getSignedUrl(r2Client!, command, { expiresIn })

    logger.info('Generated signed URL', { path, expiresIn })
    return signedUrl
  } catch (error) {
    logger.error('Failed to generate signed URL', { path, error })
    throw new Error(`Failed to generate signed URL: ${error}`)
  }
}

/**
 * Generate signed URLs for multiple images
 */
export async function generateSignedUrlBatch(
  paths: string[],
  expiresIn: number = 3600
): Promise<Record<string, string>> {
  const results = await Promise.allSettled(
    paths.map((path) => generateSignedUrl(path, expiresIn))
  )

  const urlMap: Record<string, string> = {}

  results.forEach((result, index) => {
    const path = paths[index]
    if (!path) return

    if (result.status === 'fulfilled') {
      urlMap[path] = result.value
    } else {
      logger.error('Failed to generate signed URL in batch', {
        path,
        error: result.reason,
      })
    }
  })

  return urlMap
}

/**
 * Delete image from R2
 */
export async function deleteImage(path: string): Promise<void> {
  ensureR2Configured()

  const params: DeleteObjectCommandInput = {
    Bucket: getBucketName(),
    Key: path,
  }

  try {
    await r2Client!.send(new DeleteObjectCommand(params))
    logger.info('Image deleted from R2', { path })
  } catch (error) {
    logger.error('Failed to delete image from R2', { path, error })
    throw new Error(`Failed to delete image: ${error}`)
  }
}

/**
 * Delete all images for a file
 */
export async function deleteFileImages(fileId: string): Promise<number> {
  ensureR2Configured()

  const prefix = `images/${fileId}/`

  // List all objects with prefix
  const listParams: ListObjectsV2CommandInput = {
    Bucket: getBucketName(),
    Prefix: prefix,
  }

  try {
    const listResponse = await r2Client!.send(
      new ListObjectsV2Command(listParams)
    )

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      logger.info('No images found to delete', { fileId })
      return 0
    }

    // Delete all objects
    const deletePromises = listResponse.Contents.map((object) =>
      object.Key ? deleteImage(object.Key) : Promise.resolve()
    )

    await Promise.all(deletePromises)

    logger.info('Deleted all images for file', {
      fileId,
      count: listResponse.Contents.length,
    })

    return listResponse.Contents.length
  } catch (error) {
    logger.error('Failed to delete file images', { fileId, error })
    throw new Error(`Failed to delete file images: ${error}`)
  }
}

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
  return (
    !!env.R2_ACCOUNT_ID &&
    !!env.R2_ACCESS_KEY_ID &&
    !!env.R2_SECRET_ACCESS_KEY &&
    !!env.R2_BUCKET_NAME
  )
}

/**
 * Get public URL for image (if R2 public URL is configured)
 */
export function getPublicUrl(path: string): string | null {
  if (!env.R2_PUBLIC_URL) {
    return null
  }
  return `${env.R2_PUBLIC_URL}/${path}`
}
