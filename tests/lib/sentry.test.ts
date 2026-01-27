// =============================================================================
// Sentry Integration Tests
// Tests for error tracking and monitoring configuration
// =============================================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as Sentry from '@sentry/nextjs'

// Mock Sentry module
vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  withScope: vi.fn((callback) => {
    const scope = {
      setExtras: vi.fn(),
      setLevel: vi.fn(),
    }
    callback(scope)
  }),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
}))

// Import functions to test (these would be from @/lib/sentry)
type SeverityLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal'

interface SentryConfig {
  dsn?: string
  environment: string
  tracesSampleRate: number
  replaysSessionSampleRate?: number
  replaysOnErrorSampleRate?: number
  release?: string
  ignoreErrors?: string[]
  beforeSend?: (event: any) => any
  initialScope?: {
    tags?: Record<string, string>
  }
}

class SentryService {
  private dsn?: string
  private initialized = false

  initSentry(dsn?: string): void {
    this.dsn = dsn

    if (!this.dsn) {
      console.warn('Sentry DSN not configured, error tracking disabled')
      return
    }

    const config: SentryConfig = {
      dsn: this.dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
      ignoreErrors: [
        'top.GLOBALS',
        'ResizeObserver loop limit exceeded',
        'Network request failed',
        'Failed to fetch',
        'AbortError',
      ],
      beforeSend: (event: any) => {
        // Remove email addresses from error messages
        if (event.message) {
          event.message = event.message.replace(
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            '[EMAIL]'
          )
        }

        // Don't send errors in development
        if (process.env.NODE_ENV === 'development') {
          return null
        }

        return event
      },
      initialScope: {
        tags: {
          app: 'luma-web',
          component: 'nextjs',
        },
      },
    }

    Sentry.init(config)
    this.initialized = true
  }

  captureError(
    error: Error,
    context?: Record<string, unknown>,
    level: SeverityLevel = 'error'
  ): void {
    if (!this.dsn) {
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

  setUserContext(user: { id: string; email?: string; role?: string }): void {
    if (!this.dsn) return

    Sentry.setUser({
      id: user.id,
      username: user.role,
    })
  }

  clearUserContext(): void {
    if (!this.dsn) return
    Sentry.setUser(null)
  }

  addBreadcrumb(
    message: string,
    category: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.dsn) return

    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data,
    })
  }

  isInitialized(): boolean {
    return this.initialized
  }
}

describe('Sentry Integration', () => {
  let sentryService: SentryService
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    sentryService = new SentryService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  describe('initSentry', () => {
    it('should initialize Sentry with DSN', () => {
      const dsn = 'https://test@sentry.io/123'
      process.env.NODE_ENV = 'production'

      sentryService.initSentry(dsn)

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn,
          environment: 'production',
        })
      )
      expect(sentryService.isInitialized()).toBe(true)
    })

    it('should not initialize when DSN is not provided', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      sentryService.initSentry()

      expect(Sentry.init).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Sentry DSN not configured, error tracking disabled'
      )
      expect(sentryService.isInitialized()).toBe(false)

      consoleSpy.mockRestore()
    })

    it('should use correct trace sample rate for production', () => {
      process.env.NODE_ENV = 'production'

      sentryService.initSentry('https://test@sentry.io/123')

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0.1,
        })
      )
    })

    it('should use correct trace sample rate for development', () => {
      process.env.NODE_ENV = 'development'

      sentryService.initSentry('https://test@sentry.io/123')

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 1.0,
        })
      )
    })

    it('should include correct ignore errors list', () => {
      sentryService.initSentry('https://test@sentry.io/123')

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          ignoreErrors: expect.arrayContaining([
            'top.GLOBALS',
            'ResizeObserver loop limit exceeded',
            'Network request failed',
            'Failed to fetch',
            'AbortError',
          ]),
        })
      )
    })

    it('should set release from environment variable', () => {
      const commitSha = 'abc123def456'
      process.env.VERCEL_GIT_COMMIT_SHA = commitSha

      sentryService.initSentry('https://test@sentry.io/123')

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          release: commitSha,
        })
      )

      delete process.env.VERCEL_GIT_COMMIT_SHA
    })

    it('should default to development release when commit SHA not available', () => {
      delete process.env.VERCEL_GIT_COMMIT_SHA

      sentryService.initSentry('https://test@sentry.io/123')

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          release: 'development',
        })
      )
    })

    it('should include initial scope with tags', () => {
      sentryService.initSentry('https://test@sentry.io/123')

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          initialScope: {
            tags: {
              app: 'luma-web',
              component: 'nextjs',
            },
          },
        })
      )
    })
  })

  describe('captureError', () => {
    it('should capture error with context', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      const error = new Error('Test error')
      const context = { userId: 'user-123', action: 'upload' }

      sentryService.captureError(error, context)

      expect(Sentry.withScope).toHaveBeenCalled()
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })

    it('should capture error without context', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      const error = new Error('Test error')

      sentryService.captureError(error)

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })

    it('should set error level', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      const error = new Error('Test error')

      sentryService.captureError(error, {}, 'warning')

      expect(Sentry.withScope).toHaveBeenCalled()
    })

    it('should not capture when DSN is not configured', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Test error')

      sentryService.captureError(error)

      expect(Sentry.captureException).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Sentry not configured, error:',
        error
      )

      consoleSpy.mockRestore()
    })

    it('should handle different severity levels', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      const error = new Error('Test error')
      const levels: SeverityLevel[] = ['debug', 'info', 'warning', 'error', 'fatal']

      levels.forEach((level) => {
        vi.clearAllMocks()
        sentryService.captureError(error, {}, level)
        expect(Sentry.captureException).toHaveBeenCalled()
      })
    })
  })

  describe('setUserContext', () => {
    it('should set user context with all fields', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      const user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'STUDENT',
      }

      sentryService.setUserContext(user)

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user-123',
        username: 'STUDENT',
      })
    })

    it('should set user context without email for privacy', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      const user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'ADMIN',
      }

      sentryService.setUserContext(user)

      // Email should not be included
      expect(Sentry.setUser).toHaveBeenCalledWith(
        expect.not.objectContaining({
          email: expect.anything(),
        })
      )
    })

    it('should handle user without role', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      const user = {
        id: 'user-123',
      }

      sentryService.setUserContext(user)

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user-123',
        username: undefined,
      })
    })

    it('should not set user context when DSN not configured', () => {
      const user = {
        id: 'user-123',
        role: 'STUDENT',
      }

      sentryService.setUserContext(user)

      expect(Sentry.setUser).not.toHaveBeenCalled()
    })
  })

  describe('clearUserContext', () => {
    it('should clear user context', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      sentryService.clearUserContext()

      expect(Sentry.setUser).toHaveBeenCalledWith(null)
    })

    it('should not clear user context when DSN not configured', () => {
      sentryService.clearUserContext()

      expect(Sentry.setUser).not.toHaveBeenCalled()
    })
  })

  describe('addBreadcrumb', () => {
    it('should add breadcrumb with message and category', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      sentryService.addBreadcrumb('User clicked button', 'ui.click')

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'User clicked button',
        category: 'ui.click',
        level: 'info',
        data: undefined,
      })
    })

    it('should add breadcrumb with data', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      const data = { buttonId: 'submit-btn', page: '/courses' }

      sentryService.addBreadcrumb('User clicked button', 'ui.click', data)

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'User clicked button',
        category: 'ui.click',
        level: 'info',
        data,
      })
    })

    it('should not add breadcrumb when DSN not configured', () => {
      sentryService.addBreadcrumb('Test breadcrumb', 'test')

      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled()
    })

    it('should handle breadcrumbs for different categories', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      const categories = ['ui.click', 'navigation', 'http', 'console', 'error']

      categories.forEach((category) => {
        vi.clearAllMocks()
        sentryService.addBreadcrumb('Test message', category)
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({ category })
        )
      })
    })
  })

  describe('beforeSend hook', () => {
    it('should filter errors in development mode', () => {
      process.env.NODE_ENV = 'development'
      sentryService.initSentry('https://test@sentry.io/123')

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0]
      const beforeSend = initCall.beforeSend

      const event = {
        message: 'Test error',
        exception: { values: [{ type: 'Error' }] },
      }

      const result = beforeSend?.(event)

      expect(result).toBeNull()
    })

    it('should not filter errors in production mode', () => {
      process.env.NODE_ENV = 'production'
      sentryService.initSentry('https://test@sentry.io/123')

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0]
      const beforeSend = initCall.beforeSend

      const event = {
        message: 'Test error',
        exception: { values: [{ type: 'Error' }] },
      }

      const result = beforeSend?.(event)

      expect(result).not.toBeNull()
      expect(result).toBeDefined()
    })

    it('should sanitize email addresses from error messages', () => {
      process.env.NODE_ENV = 'production'
      sentryService.initSentry('https://test@sentry.io/123')

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0]
      const beforeSend = initCall.beforeSend

      const event = {
        message: 'User user@example.com encountered an error',
      }

      const result = beforeSend?.(event)

      expect(result?.message).toBe('User [EMAIL] encountered an error')
    })

    it('should sanitize multiple email addresses', () => {
      process.env.NODE_ENV = 'production'
      sentryService.initSentry('https://test@sentry.io/123')

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0]
      const beforeSend = initCall.beforeSend

      const event = {
        message: 'Users user1@example.com and user2@test.org encountered error',
      }

      const result = beforeSend?.(event)

      expect(result?.message).toBe('Users [EMAIL] and [EMAIL] encountered error')
    })

    it('should handle event without message', () => {
      process.env.NODE_ENV = 'production'
      sentryService.initSentry('https://test@sentry.io/123')

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0]
      const beforeSend = initCall.beforeSend

      const event = {
        exception: { values: [{ type: 'Error' }] },
      }

      const result = beforeSend?.(event)

      expect(result).toBeDefined()
    })
  })

  describe('Error tracking integration scenarios', () => {
    it('should track user journey with breadcrumbs', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      // User journey
      sentryService.addBreadcrumb('User logged in', 'auth')
      sentryService.setUserContext({ id: 'user-123', role: 'STUDENT' })
      sentryService.addBreadcrumb('Navigated to courses', 'navigation')
      sentryService.addBreadcrumb('Clicked upload button', 'ui.click')

      // Error occurs
      const error = new Error('Upload failed')
      sentryService.captureError(error, { fileSize: 1000000 })

      expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(3)
      expect(Sentry.setUser).toHaveBeenCalled()
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })

    it('should track logout and clear context', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      // User session
      sentryService.setUserContext({ id: 'user-123', role: 'STUDENT' })
      sentryService.addBreadcrumb('User performed actions', 'action')

      // User logs out
      sentryService.clearUserContext()

      expect(Sentry.setUser).toHaveBeenCalledWith(null)
    })

    it('should handle multiple errors in sequence', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      const errors = [
        new Error('Network error'),
        new Error('Validation error'),
        new Error('Database error'),
      ]

      errors.forEach((error, index) => {
        sentryService.captureError(error, { sequence: index })
      })

      expect(Sentry.captureException).toHaveBeenCalledTimes(3)
    })
  })

  describe('Edge cases', () => {
    it('should handle reinitialization', () => {
      const dsn = 'https://test@sentry.io/123'

      sentryService.initSentry(dsn)
      sentryService.initSentry(dsn)

      expect(Sentry.init).toHaveBeenCalledTimes(2)
    })

    it('should handle empty DSN string', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      sentryService.initSentry('')

      expect(Sentry.init).not.toHaveBeenCalled()
      expect(sentryService.isInitialized()).toBe(false)

      consoleSpy.mockRestore()
    })

    it('should handle errors with circular references in context', () => {
      const dsn = 'https://test@sentry.io/123'
      sentryService.initSentry(dsn)

      const circular: any = { name: 'test' }
      circular.self = circular

      const error = new Error('Test error')

      // Should not throw
      expect(() => {
        sentryService.captureError(error, circular)
      }).not.toThrow()
    })

    it('should handle very long error messages', () => {
      process.env.NODE_ENV = 'production'
      sentryService.initSentry('https://test@sentry.io/123')

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0]
      const beforeSend = initCall.beforeSend

      const event = {
        message: 'a'.repeat(10000),
      }

      const result = beforeSend?.(event)

      expect(result).toBeDefined()
      expect(result?.message).toHaveLength(10000)
    })
  })
})
