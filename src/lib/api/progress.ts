/**
 * Reading Progress API Client
 */

import { apiClient } from './client'

/**
 * Reading progress data types
 */
export interface ProgressData {
  currentPage: number
  updatedAt: string
}

/**
 * Get reading progress for a file
 */
export async function getProgress(fileId: string): Promise<ProgressData> {
  return await apiClient.get<ProgressData>(`/api/files/${fileId}/progress`)
}

/**
 * Update reading progress for a file
 */
export async function updateProgress(
  fileId: string,
  currentPage: number
): Promise<ProgressData> {
  // Validate input on client side for better UX
  if (currentPage < 1) {
    throw new Error('Page number must be at least 1')
  }

  return await apiClient.patch<ProgressData>(`/api/files/${fileId}/progress`, {
    currentPage,
  })
}
