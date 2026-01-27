/**
 * API client helper functions
 */

import { getCsrfTokenFromCookie } from '@/lib/csrf'

export type ApiResponse<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: {
        code: string
        message: string
      }
    }

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Make an API request with proper error handling and automatic CSRF token inclusion
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  // Automatically include CSRF token for mutation requests
  const method = options?.method?.toUpperCase()
  if (
    method === 'POST' ||
    method === 'PATCH' ||
    method === 'PUT' ||
    method === 'DELETE'
  ) {
    const csrfToken = getCsrfTokenFromCookie()
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' },
    }))

    throw new ApiError(
      error.error?.code || 'UNKNOWN_ERROR',
      error.error?.message || 'An unknown error occurred',
      response.status
    )
  }

  const result = (await response.json().catch(() => {
    throw new ApiError(
      'PARSE_ERROR',
      'Failed to parse server response',
      response.status
    )
  })) as ApiResponse<T>

  if (!result.success) {
    throw new ApiError(result.error.code, result.error.message)
  }

  return result.data
}

/**
 * GET request
 */
export async function get<T>(
  url: string,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'GET' })
}

/**
 * POST request
 */
export async function post<T>(
  url: string,
  data?: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PATCH request
 */
export async function patch<T>(
  url: string,
  data?: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE request
 */
export async function del<T>(
  url: string,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'DELETE' })
}

/**
 * Upload file with progress tracking
 */
export async function uploadFile(
  url: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    const progressHandler = (event: ProgressEvent) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100
        onProgress(progress)
      }
    }

    const loadHandler = () => {
      cleanup()
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    }

    const errorHandler = () => {
      cleanup()
      reject(new Error('Upload failed'))
    }

    const cleanup = () => {
      xhr.upload.removeEventListener('progress', progressHandler)
      xhr.removeEventListener('load', loadHandler)
      xhr.removeEventListener('error', errorHandler)
    }

    xhr.upload.addEventListener('progress', progressHandler)
    xhr.addEventListener('load', loadHandler)
    xhr.addEventListener('error', errorHandler)

    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

/**
 * API client object with convenience methods
 * Export for use in other modules
 */
export const apiClient = {
  get,
  post,
  patch,
  delete: del,
  uploadFile,
  apiRequest,
}
