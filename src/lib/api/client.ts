/**
 * API client helper functions
 */

import { getCsrfTokenFromCookie } from '@/lib/csrf'

type ApiResponse<T> =
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

class ApiError extends Error {
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
async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

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

async function get<T>(
  url: string,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'GET' })
}

async function post<T>(
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

async function patch<T>(
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

async function del<T>(
  url: string,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'DELETE' })
}

/**
 * API client object with convenience methods
 */
export const apiClient = {
  get,
  post,
  patch,
  delete: del,
}
