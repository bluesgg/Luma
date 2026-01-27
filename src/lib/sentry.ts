/**
 * Sentry Error Tracking Configuration
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

// Re-export types for external use
export type { SeverityLevel } from '@sentry/nextjs'

/**
 * Initialize Sentry
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured, error tracking disabled')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay (optional)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      // Network errors that are expected
      'Network request failed',
      'Failed to fetch',
      // User-triggered errors
      'AbortError',
    ],

    // Filter out sensitive data
    beforeSend(event, _hint) {
      // Remove email addresses from error messages
      if (event.message) {
        event.message = event.message.replace(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
          '[EMAIL]'
        )
      }

      // In development, log errors but don't send to Sentry
      if (process.env.NODE_ENV === 'development') {
        console.error('[Sentry] Would send error:', event)
        return null
      }

      return event
    },

    // Custom tags
    initialScope: {
      tags: {
        app: 'luma-web',
        component: 'nextjs',
      },
    },
  })
}

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
 * Set user context for Sentry
 */
export function setUserContext(user: {
  id: string
  email?: string
  role?: string
}) {
  if (!SENTRY_DSN) return

  Sentry.setUser({
    id: user.id,
    // Don't include email for privacy
    username: user.role,
  })
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  if (!SENTRY_DSN) return
  Sentry.setUser(null)
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
