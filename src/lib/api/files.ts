import type { ApiSuccessResponse, ApiErrorResponse } from '@/types'
import { z } from 'zod'

// ============================================
// Validation Schemas
// ============================================

const uuidSchema = z.string().uuid('Invalid UUID format')

/**
 * Validate that a string is a valid UUID
 * @throws Error if the string is not a valid UUID
 */
function validateUUID(value: string, paramName: string): void {
  const result = uuidSchema.safeParse(value)
  if (!result.success) {
    throw new Error(`Invalid ${paramName}: ${result.error.issues[0].message}`)
  }
}

// ============================================
// Types
// ============================================

export interface FileResponse {
  id: string
  courseId: string
  userId: string
  name: string
  type: string
  pageCount: number | null
  fileSize: number | null
  isScanned: boolean
  status: 'uploading' | 'processing' | 'ready' | 'failed'
  storagePath: string | null
  createdAt: string
  updatedAt: string
}

export interface CourseInfo {
  id: string
  name: string
}

export interface FilesWithCourse {
  files: FileResponse[]
  course: CourseInfo
}

export interface UploadUrlResponse {
  fileId: string
  uploadUrl: string
  expiresAt: string
}

export interface ConfirmUploadOptions {
  pageCount?: number
}

// ============================================
// Helper Functions
// ============================================

async function parseErrorResponse(response: Response): Promise<Error> {
  try {
    const error = (await response.json()) as ApiErrorResponse
    return new Error(error.error.message)
  } catch {
    return new Error(`Request failed with status ${response.status}`)
  }
}

// ============================================
// API Functions
// ============================================

/**
 * Fetch all files for a course
 */
export async function fetchCourseFiles(courseId: string): Promise<FilesWithCourse> {
  validateUUID(courseId, 'courseId')

  const response = await fetch(`/api/courses/${encodeURIComponent(courseId)}/files`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  const data = (await response.json()) as ApiSuccessResponse<FilesWithCourse>
  return data.data
}

/**
 * Request a presigned upload URL for a new file
 */
export async function requestUploadUrl(
  courseId: string,
  fileName: string,
  fileSize: number,
  csrfHeaders: Record<string, string>
): Promise<UploadUrlResponse> {
  validateUUID(courseId, 'courseId')

  const response = await fetch(`/api/courses/${encodeURIComponent(courseId)}/files/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders,
    },
    credentials: 'include',
    body: JSON.stringify({
      fileName,
      fileSize,
    }),
  })

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  const data = (await response.json()) as ApiSuccessResponse<UploadUrlResponse>
  return data.data
}

/**
 * Confirm that a file upload is complete
 */
export async function confirmUpload(
  courseId: string,
  fileId: string,
  csrfHeaders: Record<string, string>,
  options?: ConfirmUploadOptions
): Promise<FileResponse> {
  validateUUID(courseId, 'courseId')
  validateUUID(fileId, 'fileId')

  const body = options ? JSON.stringify(options) : undefined

  const response = await fetch(`/api/courses/${encodeURIComponent(courseId)}/files/${encodeURIComponent(fileId)}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders,
    },
    credentials: 'include',
    body,
  })

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  const data = (await response.json()) as ApiSuccessResponse<{ file: FileResponse }>
  return data.data.file
}

/**
 * Delete a file
 */
export async function deleteFile(
  courseId: string,
  fileId: string,
  csrfHeaders: Record<string, string>
): Promise<void> {
  validateUUID(courseId, 'courseId')
  validateUUID(fileId, 'fileId')

  const response = await fetch(`/api/courses/${encodeURIComponent(courseId)}/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: {
      ...csrfHeaders,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }
}
