/**
 * File Management API Client
 */

import { apiClient } from './client'

/**
 * File data types
 */
export interface FileData {
  id: string
  courseId: string
  name: string
  type: 'LECTURE' | 'HOMEWORK' | 'EXAM' | 'OTHER'
  pageCount: number | null
  fileSize: string
  isScanned: boolean
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'
  structureStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED'
  structureError: string | null
  storagePath: string
  createdAt: string
  updatedAt: string
  extractedAt: string | null
  course?: {
    id: string
    name: string
  }
}

export interface UploadUrlRequest {
  fileName: string
  fileSize: number
  fileType: string
  courseId: string
}

export interface UploadUrlResponse {
  uploadUrl: string
  fileId: string
  storagePath: string
  expiresAt: string
}

export interface ConfirmUploadRequest {
  fileId: string
}

export interface ConfirmUploadResponse {
  file: FileData
}

export interface UpdateFileRequest {
  name?: string
  type?: 'LECTURE' | 'HOMEWORK' | 'EXAM' | 'OTHER'
}

export interface DownloadUrlResponse {
  downloadUrl: string
  expiresAt: string
}

/**
 * Get all files for a course
 */
export async function getFiles(courseId: string): Promise<FileData[]> {
  const response = await apiClient.get<{ files: FileData[] }>(
    `/api/courses/${courseId}/files`
  )
  return response.files
}

/**
 * Get a single file by ID
 */
export async function getFile(fileId: string): Promise<FileData> {
  const response = await apiClient.get<{ file: FileData }>(
    `/api/files/${fileId}`
  )
  return response.file
}

/**
 * Request a presigned upload URL for a new file
 */
export async function requestUploadUrl(
  data: UploadUrlRequest
): Promise<UploadUrlResponse> {
  return await apiClient.post<UploadUrlResponse>('/api/files/upload-url', data)
}

/**
 * Upload file to Supabase Storage using presigned URL
 */
export async function uploadToStorage(
  uploadUrl: string,
  file: File
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }
}

/**
 * Confirm file upload completion
 */
export async function confirmUpload(
  data: ConfirmUploadRequest
): Promise<FileData> {
  const response = await apiClient.post<ConfirmUploadResponse>(
    '/api/files/confirm',
    data
  )
  return response.file
}

/**
 * Update file metadata
 */
export async function updateFile(
  fileId: string,
  data: UpdateFileRequest
): Promise<FileData> {
  const response = await apiClient.patch<{ file: FileData }>(
    `/api/files/${fileId}`,
    data
  )
  return response.file
}

/**
 * Delete a file
 */
export async function deleteFile(fileId: string): Promise<void> {
  await apiClient.delete(`/api/files/${fileId}`)
}

/**
 * Get presigned download URL for a file
 */
export async function getDownloadUrl(fileId: string): Promise<string> {
  const response = await apiClient.get<DownloadUrlResponse>(
    `/api/files/${fileId}/download-url`
  )
  return response.downloadUrl
}
