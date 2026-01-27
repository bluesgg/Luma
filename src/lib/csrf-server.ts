'use server'

import { cookies } from 'next/headers'
import { generateCsrfToken } from './csrf'

const CSRF_TOKEN_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Get or create CSRF token
 * Note: This function only reads the token. Token creation happens in the CSRF API route.
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies()
  const existingToken = cookieStore.get(CSRF_TOKEN_NAME)?.value

  if (existingToken) {
    return existingToken
  }

  // Generate a new token (will be set by API route response)
  const newToken = generateCsrfToken()
  return newToken
}

/**
 * Validate CSRF token from request
 */
export async function validateCsrfToken(
  requestToken: string | null
): Promise<boolean> {
  if (!requestToken) {
    return false
  }

  const cookieStore = await cookies()
  const storedToken = cookieStore.get(CSRF_TOKEN_NAME)?.value

  if (!storedToken) {
    return false
  }

  return requestToken === storedToken
}

/**
 * CSRF middleware for API routes
 */
export async function requireCsrfToken(request: Request): Promise<void> {
  const token = request.headers.get(CSRF_HEADER_NAME)

  const isValid = await validateCsrfToken(token)

  if (!isValid) {
    throw new Error('Invalid CSRF token')
  }
}
