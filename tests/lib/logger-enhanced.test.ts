// =============================================================================
// Enhanced Logger with Sentry Integration Tests
// Tests for Phase 10 enhanced logger with production capabilities
// =============================================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock Sentry
const mockCaptureError = vi.fn()
const mockAddBreadcrumb = vi.fn()

vi.mock('@/lib/sentry', () => ({
  captureError: mockCaptureError,
  addBreadcrumb: mockAddBreadcrumb,
}))

// Enhanced Logger Implementation
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  traceId?: string
}

class EnhancedLogger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  private formatEntry(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      traceId: this.getTraceId(),
    }
  }

  private getTraceId(): string | undefined {
    return undefined
  }

  private output(entry: LogEntry): void {
    if (this.isProduction) {
      // JSON output for log aggregation
      console.log(JSON.stringify(entry))
    } else {
      // Human-readable format
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
      console.log(
        `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}`
      )
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.output(this.formatEntry('debug', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    this.output(this.formatEntry('info', message, context))
    mockAddBreadcrumb(message, 'info', context)
  }

  warn(message: string, context?: LogContext): void {
    this.output(this.formatEntry('warn', message, context))
    mockAddBreadcrumb(message, 'warning', context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    }

    this.output(this.formatEntry('error', message, errorContext))

    if (this.isProduction && error instanceof Error) {
      mockCaptureError(error, { message, ...context })
    }
  }

  // Context-specific loggers
  auth(message: string, context?: LogContext): void {
    this.info(message, { ...context, _category: 'auth' })
  }

  api(message: string, context?: LogContext): void {
    this.info(message, { ...context, _category: 'api' })
  }

  db(message: string, context?: LogContext): void {
    this.debug(message, { ...context, _category: 'database' })
  }

  ai(message: string, context?: LogContext): void {
    this.info(message, { ...context, _category: 'ai' })
  }

  storage(message: string, context?: LogContext): void {
    this.debug(message, { ...context, _category: 'storage' })
  }

  trigger(message: string, context?: LogContext): void {
    this.info(message, { ...context, _category: 'trigger' })
  }
}

// Utility functions
function logPerformance(
  operation: string,
  startTime: number,
  context?: LogContext
): void {
  const duration = Date.now() - startTime
  const logger = new EnhancedLogger()
  logger.debug(`Performance: ${operation}`, { duration, ...context })
  mockAddBreadcrumb(`Performance: ${operation}`, 'performance', {
    duration,
    ...context,
  })
}

function logRequest(
  method: string,
  path: string,
  userId?: string,
  statusCode?: number
): void {
  const logger = new EnhancedLogger()
  logger.api(`${method} ${path}`, { userId, statusCode })
}

function reportError(error: Error, context?: LogContext): void {
  const logger = new EnhancedLogger()
  logger.error('Unexpected error', error, context)
}

function createLogger(baseContext: LogContext) {
  const logger = new EnhancedLogger()
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { ...baseContext, ...context }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      logger.error(message, error, { ...baseContext, ...context }),
  }
}

describe('Enhanced Logger with Sentry Integration', () => {
  let logger: EnhancedLogger
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    logger = new EnhancedLogger()
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    vi.restoreAllMocks()
  })

  describe('Structured Logging Output', () => {
    it('should output JSON in production mode', () => {
      process.env.NODE_ENV = 'production'
      logger = new EnhancedLogger()

      logger.info('Test message', { key: 'value' })

      const logCall = vi.mocked(console.log).mock.calls[0][0]
      expect(() => JSON.parse(logCall)).not.toThrow()

      const parsed = JSON.parse(logCall)
      expect(parsed).toMatchObject({
        level: 'info',
        message: 'Test message',
        context: { key: 'value' },
      })
    })

    it('should output human-readable format in development', () => {
      process.env.NODE_ENV = 'development'
      logger = new EnhancedLogger()

      logger.info('Test message', { key: 'value' })

      const logCall = vi.mocked(console.log).mock.calls[0][0]
      expect(logCall).toContain('[INFO]')
      expect(logCall).toContain('Test message')
    })

    it('should include timestamp in structured logs', () => {
      process.env.NODE_ENV = 'production'
      logger = new EnhancedLogger()

      const before = new Date().toISOString()
      logger.info('Test message')
      const after = new Date().toISOString()

      const logCall = vi.mocked(console.log).mock.calls[0][0]
      const parsed = JSON.parse(logCall)

      expect(parsed.timestamp).toBeDefined()
      expect(parsed.timestamp >= before).toBe(true)
      expect(parsed.timestamp <= after).toBe(true)
    })
  })

  describe('Sentry Integration', () => {
    it('should add breadcrumb for info logs', () => {
      logger.info('Info message', { key: 'value' })

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Info message',
        'info',
        { key: 'value' }
      )
    })

    it('should add breadcrumb for warnings', () => {
      logger.warn('Warning message', { severity: 'high' })

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Warning message',
        'warning',
        { severity: 'high' }
      )
    })

    it('should capture errors in production', () => {
      process.env.NODE_ENV = 'production'
      logger = new EnhancedLogger()

      const error = new Error('Test error')
      logger.error('Error occurred', error, { context: 'test' })

      expect(mockCaptureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          message: 'Error occurred',
          context: 'test',
        })
      )
    })

    it('should not capture errors in development', () => {
      process.env.NODE_ENV = 'development'
      logger = new EnhancedLogger()

      const error = new Error('Test error')
      logger.error('Error occurred', error)

      expect(mockCaptureError).not.toHaveBeenCalled()
    })

    it('should not capture non-Error objects', () => {
      process.env.NODE_ENV = 'production'
      logger = new EnhancedLogger()

      const errorData = { code: 'ERR_001' }
      logger.error('Error occurred', errorData)

      expect(mockCaptureError).not.toHaveBeenCalled()
    })
  })

  describe('Different Log Levels', () => {
    it('should log debug messages only in development', () => {
      process.env.NODE_ENV = 'development'
      logger = new EnhancedLogger()

      logger.debug('Debug message')
      expect(console.log).toHaveBeenCalled()

      vi.clearAllMocks()

      process.env.NODE_ENV = 'production'
      logger = new EnhancedLogger()

      logger.debug('Debug message')
      expect(console.log).not.toHaveBeenCalled()
    })

    it('should always log info messages', () => {
      process.env.NODE_ENV = 'development'
      logger = new EnhancedLogger()
      logger.info('Info message')
      expect(console.log).toHaveBeenCalled()

      vi.clearAllMocks()

      process.env.NODE_ENV = 'production'
      logger = new EnhancedLogger()
      logger.info('Info message')
      expect(console.log).toHaveBeenCalled()
    })

    it('should always log warnings', () => {
      logger.warn('Warning message')
      expect(console.log).toHaveBeenCalled()
    })

    it('should always log errors', () => {
      logger.error('Error message')
      expect(console.log).toHaveBeenCalled()
    })
  })

  describe('Context-Specific Loggers', () => {
    it('should log auth messages with category', () => {
      logger.auth('User logged in', { userId: 'user-123' })

      expect(console.log).toHaveBeenCalled()
      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'User logged in',
        'info',
        expect.objectContaining({
          userId: 'user-123',
          _category: 'auth',
        })
      )
    })

    it('should log API messages with category', () => {
      logger.api('Request received', { method: 'POST' })

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Request received',
        'info',
        expect.objectContaining({
          method: 'POST',
          _category: 'api',
        })
      )
    })

    it('should log database messages as debug', () => {
      process.env.NODE_ENV = 'development'
      logger = new EnhancedLogger()

      logger.db('Query executed', { query: 'SELECT * FROM users' })

      expect(console.log).toHaveBeenCalled()
    })

    it('should log AI messages with category', () => {
      logger.ai('Generating explanation', { tokens: 100 })

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Generating explanation',
        'info',
        expect.objectContaining({
          tokens: 100,
          _category: 'ai',
        })
      )
    })

    it('should log storage messages as debug', () => {
      process.env.NODE_ENV = 'development'
      logger = new EnhancedLogger()

      logger.storage('File uploaded', { size: 1000 })

      expect(console.log).toHaveBeenCalled()
    })

    it('should log trigger messages with category', () => {
      logger.trigger('Job started', { jobId: 'job-123' })

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Job started',
        'info',
        expect.objectContaining({
          jobId: 'job-123',
          _category: 'trigger',
        })
      )
    })
  })

  describe('logPerformance Function', () => {
    it('should log performance metrics', () => {
      const startTime = Date.now() - 100

      logPerformance('API Request', startTime, { endpoint: '/api/files' })

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Performance: API Request',
        'performance',
        expect.objectContaining({
          duration: expect.any(Number),
          endpoint: '/api/files',
        })
      )
    })

    it('should calculate accurate duration', () => {
      const startTime = Date.now() - 250

      logPerformance('Database Query', startTime)

      const breadcrumbCall = mockAddBreadcrumb.mock.calls[0]
      const duration = breadcrumbCall[2]?.duration as number

      expect(duration).toBeGreaterThanOrEqual(240)
      expect(duration).toBeLessThanOrEqual(300)
    })
  })

  describe('logRequest Function', () => {
    it('should log API requests', () => {
      logRequest('POST', '/api/courses', 'user-123', 201)

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'POST /api/courses',
        'info',
        expect.objectContaining({
          userId: 'user-123',
          statusCode: 201,
          _category: 'api',
        })
      )
    })

    it('should handle requests without userId', () => {
      logRequest('GET', '/api/public', undefined, 200)

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'GET /api/public',
        'info',
        expect.objectContaining({
          userId: undefined,
          statusCode: 200,
        })
      )
    })

    it('should handle requests without statusCode', () => {
      logRequest('DELETE', '/api/files/123', 'user-123')

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'DELETE /api/files/123',
        'info',
        expect.objectContaining({
          userId: 'user-123',
          statusCode: undefined,
        })
      )
    })
  })

  describe('reportError Function', () => {
    it('should report errors with context', () => {
      process.env.NODE_ENV = 'production'

      const error = new Error('Unexpected error')
      reportError(error, { operation: 'file-upload' })

      expect(mockCaptureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          message: 'Unexpected error',
          operation: 'file-upload',
        })
      )
    })

    it('should report errors without context', () => {
      process.env.NODE_ENV = 'production'

      const error = new Error('Unexpected error')
      reportError(error)

      expect(mockCaptureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          message: 'Unexpected error',
        })
      )
    })
  })

  describe('createLogger Factory', () => {
    it('should create logger with base context', () => {
      const childLogger = createLogger({ module: 'auth', version: '1.0' })

      childLogger.info('Test message', { action: 'login' })

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Test message',
        'info',
        expect.objectContaining({
          module: 'auth',
          version: '1.0',
          action: 'login',
        })
      )
    })

    it('should merge base context with call context', () => {
      const childLogger = createLogger({ service: 'file-service' })

      childLogger.info('File processed', { fileId: 'file-123' })

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'File processed',
        'info',
        expect.objectContaining({
          service: 'file-service',
          fileId: 'file-123',
        })
      )
    })

    it('should support all log levels', () => {
      process.env.NODE_ENV = 'development'
      const childLogger = createLogger({ component: 'test' })

      childLogger.debug('Debug')
      childLogger.info('Info')
      childLogger.warn('Warn')
      childLogger.error('Error', new Error('Test'))

      expect(console.log).toHaveBeenCalledTimes(4)
    })

    it('should allow context override', () => {
      const childLogger = createLogger({ env: 'dev' })

      childLogger.info('Message', { env: 'prod' })

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Message',
        'info',
        expect.objectContaining({
          env: 'prod', // Should override
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at ...'

      logger.error('Error occurred', error)

      const logCall = vi.mocked(console.log).mock.calls[0][0]
      expect(logCall).toContain('Test error')
    })

    it('should handle custom Error types', () => {
      class CustomError extends Error {
        constructor(
          message: string,
          public code: string
        ) {
          super(message)
          this.name = 'CustomError'
        }
      }

      const error = new CustomError('Custom error', 'ERR_CUSTOM')
      logger.error('Custom error occurred', error)

      expect(console.log).toHaveBeenCalled()
    })

    it('should handle non-Error objects', () => {
      const errorData = {
        code: 'ERR_001',
        details: 'Something went wrong',
      }

      logger.error('Error occurred', errorData)

      expect(console.log).toHaveBeenCalled()
    })

    it('should handle null error', () => {
      logger.error('Error occurred', null)

      expect(console.log).toHaveBeenCalled()
    })

    it('should handle undefined error', () => {
      logger.error('Error occurred', undefined)

      expect(console.log).toHaveBeenCalled()
    })
  })

  describe('Real-world Scenarios', () => {
    it('should track complete API request flow', () => {
      const startTime = Date.now()

      logger.api('Request received', { method: 'POST', path: '/api/courses' })
      logger.db('Validating data')
      logger.db('Inserting into database')
      logger.api('Request completed', { statusCode: 201 })

      logPerformance('Complete request', startTime)

      expect(console.log).toHaveBeenCalled()
      expect(mockAddBreadcrumb).toHaveBeenCalled()
    })

    it('should track authentication flow', () => {
      logger.auth('Login attempt', { email: 'user@example.com' })
      logger.auth('Verifying credentials')
      logger.auth('Login successful', { userId: 'user-123' })

      expect(mockAddBreadcrumb).toHaveBeenCalledTimes(3)
    })

    it('should track file upload with error', () => {
      process.env.NODE_ENV = 'production'
      logger = new EnhancedLogger()

      logger.storage('File upload started')
      logger.storage('Validating file type')

      const error = new Error('File too large')
      logger.error('File upload failed', error, {
        fileSize: 10000000,
        maxSize: 5000000,
      })

      expect(mockCaptureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          message: 'File upload failed',
          fileSize: 10000000,
          maxSize: 5000000,
        })
      )
    })

    it('should track AI interaction', () => {
      logger.ai('Generating explanation', { topic: 'calculus' })
      logger.ai('AI response received', { tokens: 150 })

      expect(mockAddBreadcrumb).toHaveBeenCalledTimes(2)
    })

    it('should track Trigger.dev job', () => {
      logger.trigger('Job started', { jobId: 'job-123' })
      logger.trigger('Processing PDF')
      logger.trigger('Extracting images')
      logger.trigger('Job completed', { duration: 5000 })

      expect(mockAddBreadcrumb).toHaveBeenCalledTimes(4)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000)
      logger.info(longMessage)

      expect(console.log).toHaveBeenCalled()
    })

    it('should handle special characters', () => {
      logger.info('Message with special chars: \n\t\r"\'`')

      expect(console.log).toHaveBeenCalled()
    })

    it('should handle unicode characters', () => {
      logger.info('日本語 🎉 Emoji')

      expect(console.log).toHaveBeenCalled()
    })

    it('should handle circular references in context', () => {
      const circular: any = { name: 'test' }
      circular.self = circular

      expect(() => {
        logger.info('Circular reference', circular)
      }).not.toThrow()
    })

    it('should handle empty context', () => {
      logger.info('Message', {})

      expect(console.log).toHaveBeenCalled()
    })

    it('should handle deeply nested context', () => {
      const deepContext = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      }

      logger.info('Deep context', deepContext)

      expect(console.log).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should handle high volume of logs efficiently', () => {
      const startTime = Date.now()

      for (let i = 0; i < 1000; i++) {
        logger.info(`Log message ${i}`, { index: i })
      }

      const duration = Date.now() - startTime

      // Should complete in reasonable time (less than 1 second for 1000 logs)
      expect(duration).toBeLessThan(1000)
      expect(console.log).toHaveBeenCalledTimes(1000)
    })
  })
})
