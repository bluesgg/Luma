import { randomBytes } from 'crypto'

const CSRF_TOKEN_NAME = 'csrf-token'

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Client-side CSRF token retrieval
 */
export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';')
  const csrfCookie = cookies.find((cookie) =>
    cookie.trim().startsWith(`${CSRF_TOKEN_NAME}=`)
  )

  if (!csrfCookie) return null

  const token = csrfCookie.split('=')[1]
  return token || null
}
