/**
 * Sentry Error Tracking Configuration
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

/**
 * Capture an error with context
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'error'
) {
  if (!SENTRY_DSN) {
    console.error('Sentry not configured, error:', error)
    return
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context)
    }
    scope.setLevel(level)
    Sentry.captureException(error)
  })
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  if (!SENTRY_DSN) return

  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  })
}
