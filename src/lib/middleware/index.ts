/**
 * Middleware utilities for route protection and authentication
 */

export {
  isAuthOnlyRoute,
  isProtectedRoute,
  isAdminRoute,
  isAdminLoginRoute,
  isCronRoute,
  isPublicApiRoute,
  matchRoute,
} from './route-matchers'

export { validateCronSecret, CRON_SECRET_HEADER } from './cron-validation'
