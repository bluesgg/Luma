import { ROUTES } from '@/lib/constants'

/**
 * Normalizes a pathname by:
 * - Decoding URL-encoded characters (e.g., %2F → /)
 * - Removing query parameters and hash fragments
 * - Collapsing multiple slashes
 * - Removing trailing slashes (except for root)
 *
 * This prevents bypass attempts like:
 * - /courses%2F..%2Fadmin (URL-encoded path traversal)
 * - /courses//123 (double slashes)
 * - /courses#bypass (hash fragments)
 *
 * Note: Dot segments (../ and ./) are typically handled by Next.js before
 * reaching middleware. This function focuses on other normalization.
 *
 * @param pathname - The URL pathname to normalize
 * @returns Normalized pathname
 */
function normalizePath(pathname: string): string {
  if (!pathname || typeof pathname !== 'string') {
    return '/'
  }

  // Decode URL-encoded characters to prevent bypass attempts
  let cleanPath: string
  try {
    cleanPath = decodeURIComponent(pathname)
  } catch {
    // Invalid encoding - use original path
    cleanPath = pathname
  }

  // Remove query parameters and hash fragments
  cleanPath = cleanPath.split('?')[0].split('#')[0]

  // Collapse multiple slashes into single slash
  cleanPath = cleanPath.replace(/\/+/g, '/')

  // Remove trailing slash (except for root)
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1)
  }

  return cleanPath || '/'
}

/**
 * Matches a pathname against a list of route patterns
 * Handles both exact matches and prefix matches (for nested routes)
 *
 * Security: Normalizes the pathname to prevent bypass attempts
 *
 * @param pathname - The URL pathname to match
 * @param patterns - Array of route patterns to match against
 * @returns true if the pathname matches any pattern
 */
export function matchRoute(pathname: string, patterns: readonly string[]): boolean {
  const normalizedPath = normalizePath(pathname)

  return patterns.some((pattern) => {
    // Exact match
    if (normalizedPath === pattern) {
      return true
    }

    // Prefix match - ensure we match full path segments
    // e.g., /courses/123 matches /courses, but /coursesextra does not
    if (normalizedPath.startsWith(pattern + '/')) {
      return true
    }

    return false
  })
}

/**
 * Check if the route is an auth-only route (login, register, etc.)
 * Authenticated users should be redirected away from these routes
 */
export function isAuthOnlyRoute(pathname: string): boolean {
  return matchRoute(pathname, ROUTES.AUTH_ONLY)
}

/**
 * Check if the route is a protected route (requires authentication)
 * Unauthenticated users should be redirected to login
 */
export function isProtectedRoute(pathname: string): boolean {
  return matchRoute(pathname, ROUTES.PROTECTED)
}

/**
 * Check if the route is an admin route
 */
export function isAdminRoute(pathname: string): boolean {
  const normalizedPath = normalizePath(pathname)
  return normalizedPath === '/admin' || normalizedPath.startsWith('/admin/')
}

/**
 * Check if the route is the admin login route
 */
export function isAdminLoginRoute(pathname: string): boolean {
  const normalizedPath = normalizePath(pathname)
  return normalizedPath === ROUTES.ADMIN_LOGIN
}

/**
 * Check if the route is a CRON API route
 * These routes require CRON_SECRET validation
 */
export function isCronRoute(pathname: string): boolean {
  const normalizedPath = normalizePath(pathname)
  return normalizedPath.startsWith('/api/cron/')
}

/**
 * Check if the route is a public API route (no auth required)
 */
export function isPublicApiRoute(pathname: string): boolean {
  return matchRoute(pathname, ROUTES.PUBLIC_API)
}
