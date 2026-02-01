import { NextResponse } from 'next/server';

/**
 * Standardized API response helpers
 * Ensures consistent response format across all endpoints
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a success response
 * @param data - Data to include in the response
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with standardized success format
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Create an error response
 * @param code - Error code (e.g., 'VALIDATION_ERROR', 'UNAUTHORIZED')
 * @param message - User-friendly error message
 * @param status - HTTP status code (default: 400)
 * @returns NextResponse with standardized error format
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

/**
 * Common error responses
 */
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  EMAIL_EXISTS: 'EMAIL_EXISTS',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Token errors
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // CSRF
  INVALID_CSRF_TOKEN: 'INVALID_CSRF_TOKEN',

  // Generic errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  FORBIDDEN: 'FORBIDDEN',
} as const;
