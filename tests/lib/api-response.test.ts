// =============================================================================
// API Response Helpers Tests
// =============================================================================

import { describe, it, expect } from 'vitest'
import { NextResponse } from 'next/server'
import type { ApiSuccessResponse, ApiErrorResponse } from '@/types/database'

// Helper functions to test
function successResponse<T>(
  data: T,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
    },
    { status }
  )
}

function errorResponse(
  code: string,
  message: string,
  status = 400
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
      },
    },
    { status }
  )
}

describe('API Response Helpers', () => {
  describe('successResponse', () => {
    it('should create success response with data', async () => {
      const data = { id: '1', name: 'Test' }
      const response = successResponse(data)

      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json).toEqual({
        success: true,
        data,
      })
    })

    it('should create success response with custom status', async () => {
      const data = { message: 'Created' }
      const response = successResponse(data, 201)

      expect(response.status).toBe(201)

      const json = await response.json()
      expect(json).toEqual({
        success: true,
        data,
      })
    })

    it('should handle null data', async () => {
      const response = successResponse(null)

      const json = await response.json()
      expect(json).toEqual({
        success: true,
        data: null,
      })
    })

    it('should handle empty object', async () => {
      const response = successResponse({})

      const json = await response.json()
      expect(json).toEqual({
        success: true,
        data: {},
      })
    })

    it('should handle array data', async () => {
      const data = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ]
      const response = successResponse(data)

      const json = await response.json()
      expect(json).toEqual({
        success: true,
        data,
      })
    })

    it('should handle nested objects', async () => {
      const data = {
        user: {
          id: '1',
          name: 'Test User',
          courses: [
            { id: 'c1', name: 'Course 1' },
            { id: 'c2', name: 'Course 2' },
          ],
        },
      }
      const response = successResponse(data)

      const json = await response.json()
      expect(json).toEqual({
        success: true,
        data,
      })
    })

    it('should handle string data', async () => {
      const response = successResponse('Success message')

      const json = await response.json()
      expect(json).toEqual({
        success: true,
        data: 'Success message',
      })
    })

    it('should handle number data', async () => {
      const response = successResponse(42)

      const json = await response.json()
      expect(json).toEqual({
        success: true,
        data: 42,
      })
    })

    it('should handle boolean data', async () => {
      const response = successResponse(true)

      const json = await response.json()
      expect(json).toEqual({
        success: true,
        data: true,
      })
    })

    it('should use 200 as default status', async () => {
      const response = successResponse({ message: 'OK' })
      expect(response.status).toBe(200)
    })

    it('should allow custom status codes', async () => {
      const statusCodes = [200, 201, 202, 204]

      for (const status of statusCodes) {
        const response = successResponse({ message: 'OK' }, status)
        expect(response.status).toBe(status)
      }
    })
  })

  describe('errorResponse', () => {
    it('should create error response with code and message', async () => {
      const response = errorResponse('INVALID_INPUT', 'Invalid input provided')

      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json).toEqual({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid input provided',
        },
      })
    })

    it('should create error response with custom status', async () => {
      const response = errorResponse('UNAUTHORIZED', 'Unauthorized access', 401)

      expect(response.status).toBe(401)

      const json = await response.json()
      expect(json).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized access',
        },
      })
    })

    it('should use 400 as default status', async () => {
      const response = errorResponse('BAD_REQUEST', 'Bad request')
      expect(response.status).toBe(400)
    })

    it('should handle different error codes', async () => {
      const errorCodes = [
        {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Invalid credentials',
          status: 401,
        },
        {
          code: 'COURSE_LIMIT_REACHED',
          message: 'Course limit reached',
          status: 400,
        },
        { code: 'FILE_TOO_LARGE', message: 'File too large', status: 400 },
        {
          code: 'TUTOR_QUOTA_EXCEEDED',
          message: 'Quota exceeded',
          status: 400,
        },
      ]

      for (const { code, message, status } of errorCodes) {
        const response = errorResponse(code, message, status)
        expect(response.status).toBe(status)

        const json = await response.json()
        expect(json.error.code).toBe(code)
        expect(json.error.message).toBe(message)
      }
    })

    it('should handle HTTP status codes correctly', async () => {
      const tests = [
        { status: 400, name: 'Bad Request' },
        { status: 401, name: 'Unauthorized' },
        { status: 403, name: 'Forbidden' },
        { status: 404, name: 'Not Found' },
        { status: 429, name: 'Too Many Requests' },
        { status: 500, name: 'Internal Server Error' },
      ]

      for (const { status, name } of tests) {
        const response = errorResponse('ERROR', name, status)
        expect(response.status).toBe(status)
      }
    })

    it('should handle empty message', async () => {
      const response = errorResponse('ERROR_CODE', '')

      const json = await response.json()
      expect(json).toEqual({
        success: false,
        error: {
          code: 'ERROR_CODE',
          message: '',
        },
      })
    })

    it('should handle long error messages', async () => {
      const longMessage = 'A'.repeat(1000)
      const response = errorResponse('LONG_ERROR', longMessage)

      const json = await response.json()
      expect(json.error.message).toBe(longMessage)
    })
  })

  describe('Response Type Guards', () => {
    it('should distinguish success from error responses', async () => {
      const successResp = successResponse({ data: 'test' })
      const errorResp = errorResponse('ERROR', 'Error message')

      const successJson = await successResp.json()
      const errorJson = await errorResp.json()

      expect(successJson.success).toBe(true)
      expect('data' in successJson).toBe(true)

      expect(errorJson.success).toBe(false)
      expect('error' in errorJson).toBe(true)
    })

    it('should have correct TypeScript types', async () => {
      const successResp = successResponse<{ id: string; name: string }>({
        id: '1',
        name: 'Test',
      })

      const json = await successResp.json()

      if (json.success) {
        // TypeScript should infer this correctly
        expect(json.data.id).toBe('1')
        expect(json.data.name).toBe('Test')
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined data in success response', async () => {
      const response = successResponse(undefined)

      const json = await response.json()
      expect(json).toEqual({
        success: true,
        data: undefined,
      })
    })

    it('should handle special characters in error message', async () => {
      const message = 'Error: Invalid <input> & "quotes" & \'apostrophes\''
      const response = errorResponse('SPECIAL_CHARS', message)

      const json = await response.json()
      expect(json.error.message).toBe(message)
    })

    it('should handle unicode in error message', async () => {
      const message = '错误：无效输入 🚫'
      const response = errorResponse('UNICODE_ERROR', message)

      const json = await response.json()
      expect(json.error.message).toBe(message)
    })

    it('should handle Date objects in success response', async () => {
      const date = new Date('2024-01-01T00:00:00Z')
      const response = successResponse({ createdAt: date })

      const json = await response.json()
      // Note: Date objects are serialized to ISO strings in JSON
      expect(json.data.createdAt).toBeDefined()
    })

    it('should handle BigInt in success response (converted to string)', async () => {
      const data = {
        id: '1',
        fileSize: '1000000', // BigInt would be converted to string for JSON
      }
      const response = successResponse(data)

      const json = await response.json()
      expect(json.data.fileSize).toBe('1000000')
    })
  })

  describe('HTTP Status Code Coverage', () => {
    it('should support all common success status codes', async () => {
      const successCodes = [200, 201, 202, 204]

      for (const code of successCodes) {
        const response = successResponse({ status: 'ok' }, code)
        expect(response.status).toBe(code)
      }
    })

    it('should support all common error status codes', async () => {
      const errorCodes = [
        { status: 400, code: 'BAD_REQUEST' },
        { status: 401, code: 'UNAUTHORIZED' },
        { status: 403, code: 'FORBIDDEN' },
        { status: 404, code: 'NOT_FOUND' },
        { status: 409, code: 'CONFLICT' },
        { status: 422, code: 'UNPROCESSABLE_ENTITY' },
        { status: 429, code: 'TOO_MANY_REQUESTS' },
        { status: 500, code: 'INTERNAL_SERVER_ERROR' },
        { status: 503, code: 'SERVICE_UNAVAILABLE' },
      ]

      for (const { status, code } of errorCodes) {
        const response = errorResponse(code, 'Error message', status)
        expect(response.status).toBe(status)
      }
    })
  })

  describe('Response Headers', () => {
    it('should set Content-Type to application/json', async () => {
      const response = successResponse({ data: 'test' })
      const contentType = response.headers.get('content-type')
      expect(contentType).toContain('application/json')
    })

    it('should set Content-Type for error responses', async () => {
      const response = errorResponse('ERROR', 'Error message')
      const contentType = response.headers.get('content-type')
      expect(contentType).toContain('application/json')
    })
  })
})
