import { generateToken } from './token';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';

/**
 * CSRF (Cross-Site Request Forgery) protection utilities
 * Generates and validates CSRF tokens for mutation endpoints
 */

const CSRF_TOKEN_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a new CSRF token and set it as a cookie
 * @returns The generated CSRF token
 */
export async function generateCsrfToken(): Promise<string> {
  const token = generateToken(32);
  const cookieStore = await cookies();

  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return token;
}

/**
 * Get the current CSRF token from cookies
 * @returns The CSRF token or null if not found
 */
export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_TOKEN_NAME);
  return token?.value || null;
}

/**
 * Validate CSRF token from request headers
 * @param request - The incoming request
 * @returns True if CSRF token is valid
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  const cookieToken = await getCsrfToken();

  if (!headerToken || !cookieToken) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  const headerBuffer = Buffer.from(headerToken);
  const cookieBuffer = Buffer.from(cookieToken);

  if (headerBuffer.length !== cookieBuffer.length) {
    return false;
  }

  return timingSafeEqual(headerBuffer, cookieBuffer);
}

/**
 * Middleware helper to check CSRF token
 * Throws an error if token is invalid
 */
export async function requireCsrfToken(request: Request): Promise<void> {
  const isValid = await validateCsrfToken(request);
  if (!isValid) {
    throw new Error('Invalid CSRF token');
  }
}
