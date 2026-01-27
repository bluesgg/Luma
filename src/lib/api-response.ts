import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ERROR_CODES } from './constants'
import { logger } from './logger'

/**
 * Standard API response format
 */
export type ApiSuccessResponse<T> = {
  success: true
  data: T
}

export type ApiErrorResponse = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Success response helper
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

/**
 * Error response helper
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  )
}

/**
 * Handle Zod validation errors
 */
export function validationErrorResponse(
  error: ZodError
): NextResponse<ApiErrorResponse> {
  return errorResponse(
    ERROR_CODES.VALIDATION_ERROR,
    'Validation failed',
    400,
    error.errors
  )
}

/**
 * Handle generic errors
 */
export function handleError(error: unknown): NextResponse<ApiErrorResponse> {
  logger.error('API Error', error)

  if (error instanceof ZodError) {
    return validationErrorResponse(error)
  }

  if (error instanceof Error) {
    // Check for known error patterns
    if (error.message.includes('Unauthorized')) {
      return errorResponse(
        ERROR_CODES.AUTH_UNAUTHORIZED,
        'Unauthorized access',
        401
      )
    }

    if (error.message.includes('Not found')) {
      return errorResponse(ERROR_CODES.NOT_FOUND, 'Resource not found', 404)
    }

    return errorResponse(ERROR_CODES.INTERNAL_SERVER_ERROR, error.message, 500)
  }

  return errorResponse(
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    'An unexpected error occurred',
    500
  )
}

/**
 * Common HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const
