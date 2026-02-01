/**
 * Types Index
 *
 * Central export point for all type definitions
 */

export * from './database'

// API Response Types
export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
