// =============================================================================
// Logger Utility Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Logger implementation
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: Date
  module?: string
}

class Logger {
  private logs: LogEntry[] = []
  private minLevel: LogLevel
  private enableConsole: boolean

  constructor(minLevel: LogLevel = LogLevel.INFO, enableConsole = false) {
    this.minLevel = minLevel
    this.enableConsole = enableConsole
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ]
    const currentLevelIndex = levels.indexOf(level)
    const minLevelIndex = levels.indexOf(this.minLevel)
    return currentLevelIndex >= minLevelIndex
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    module?: string
  ): void {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      module,
    }

    this.logs.push(entry)

    if (this.enableConsole) {
      const consoleMethod =
        level === LogLevel.ERROR
          ? 'error'
          : level === LogLevel.WARN
            ? 'warn'
            : level === LogLevel.DEBUG
              ? 'debug'
              : 'log'
      console[consoleMethod](
        `[${level.toUpperCase()}]${module ? ` [${module}]` : ''} ${message}`,
        context || ''
      )
    }
  }

  debug(
    message: string,
    context?: Record<string, unknown>,
    module?: string
  ): void {
    this.log(LogLevel.DEBUG, message, context, module)
  }

  info(
    message: string,
    context?: Record<string, unknown>,
    module?: string
  ): void {
    this.log(LogLevel.INFO, message, context, module)
  }

  warn(
    message: string,
    context?: Record<string, unknown>,
    module?: string
  ): void {
    this.log(LogLevel.WARN, message, context, module)
  }

  error(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>,
    module?: string
  ): void {
    const errorContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    }
    this.log(LogLevel.ERROR, message, errorContext, module)
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level)
  }

  getLogsByModule(module: string): LogEntry[] {
    return this.logs.filter((log) => log.module === module)
  }

  clear(): void {
    this.logs = []
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level
  }

  getLogCount(): number {
    return this.logs.length
  }
}

// Factory functions for common logger configurations
const createProductionLogger = () => new Logger(LogLevel.WARN, false)
const createDevelopmentLogger = () => new Logger(LogLevel.DEBUG, true)
const createTestLogger = () => new Logger(LogLevel.INFO, false)

describe('Logger Utility', () => {
  let logger: Logger

  beforeEach(() => {
    logger = new Logger(LogLevel.DEBUG, false)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Logging', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe(LogLevel.DEBUG)
      expect(logs[0].message).toBe('Debug message')
    })

    it('should log info messages', () => {
      logger.info('Info message')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe(LogLevel.INFO)
      expect(logs[0].message).toBe('Info message')
    })

    it('should log warning messages', () => {
      logger.warn('Warning message')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe(LogLevel.WARN)
      expect(logs[0].message).toBe('Warning message')
    })

    it('should log error messages', () => {
      logger.error('Error message')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe(LogLevel.ERROR)
      expect(logs[0].message).toBe('Error message')
    })
  })

  describe('Context Logging', () => {
    it('should log messages with context', () => {
      const context = { userId: '123', action: 'login' }
      logger.info('User logged in', context)

      const logs = logger.getLogs()
      expect(logs[0].context).toEqual(context)
    })

    it('should log messages with module', () => {
      logger.info('Message', undefined, 'auth')

      const logs = logger.getLogs()
      expect(logs[0].module).toBe('auth')
    })

    it('should log messages with context and module', () => {
      const context = { requestId: 'req-123' }
      logger.info('API request', context, 'api')

      const logs = logger.getLogs()
      expect(logs[0].context).toEqual(context)
      expect(logs[0].module).toBe('api')
    })

    it('should handle nested context objects', () => {
      const context = {
        user: {
          id: '123',
          email: 'user@example.com',
        },
        request: {
          method: 'POST',
          path: '/api/courses',
        },
      }

      logger.info('Request processed', context)

      const logs = logger.getLogs()
      expect(logs[0].context).toEqual(context)
    })
  })

  describe('Error Logging', () => {
    it('should log Error objects', () => {
      const error = new Error('Test error')
      logger.error('An error occurred', error)

      const logs = logger.getLogs()
      expect(logs[0].context?.error).toBeDefined()
      const errorContext = logs[0].context?.error as Record<string, unknown>
      expect(errorContext.name).toBe('Error')
      expect(errorContext.message).toBe('Test error')
      expect(errorContext.stack).toBeDefined()
    })

    it('should log custom Error objects', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }

      const error = new CustomError('Custom error')
      logger.error('Custom error occurred', error)

      const logs = logger.getLogs()
      const errorContext = logs[0].context?.error as Record<string, unknown>
      expect(errorContext.name).toBe('CustomError')
      expect(errorContext.message).toBe('Custom error')
    })

    it('should log non-Error objects', () => {
      const errorData = { code: 'ERR_001', details: 'Something went wrong' }
      logger.error('Error occurred', errorData)

      const logs = logger.getLogs()
      expect(logs[0].context?.error).toEqual(errorData)
    })

    it('should merge error with additional context', () => {
      const error = new Error('Test error')
      const context = { userId: '123', action: 'upload' }
      logger.error('Upload failed', error, context)

      const logs = logger.getLogs()
      expect(logs[0].context?.userId).toBe('123')
      expect(logs[0].context?.action).toBe('upload')
      expect(logs[0].context?.error).toBeDefined()
    })
  })

  describe('Log Levels', () => {
    it('should respect minimum log level', () => {
      const logger = new Logger(LogLevel.WARN)

      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(2)
      expect(logs[0].level).toBe(LogLevel.WARN)
      expect(logs[1].level).toBe(LogLevel.ERROR)
    })

    it('should log all levels when min level is DEBUG', () => {
      const logger = new Logger(LogLevel.DEBUG)

      logger.debug('Debug')
      logger.info('Info')
      logger.warn('Warning')
      logger.error('Error')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(4)
    })

    it('should only log errors when min level is ERROR', () => {
      const logger = new Logger(LogLevel.ERROR)

      logger.debug('Debug')
      logger.info('Info')
      logger.warn('Warning')
      logger.error('Error')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe(LogLevel.ERROR)
    })

    it('should allow changing min level at runtime', () => {
      logger.setMinLevel(LogLevel.ERROR)
      logger.info('Should not be logged')
      logger.error('Should be logged')

      let logs = logger.getLogs()
      expect(logs).toHaveLength(1)

      logger.setMinLevel(LogLevel.DEBUG)
      logger.debug('Now debug is logged')

      logs = logger.getLogs()
      expect(logs).toHaveLength(2)
    })
  })

  describe('Log Retrieval', () => {
    beforeEach(() => {
      logger.debug('Debug', undefined, 'module1')
      logger.info('Info', undefined, 'module1')
      logger.warn('Warning', undefined, 'module2')
      logger.error('Error', undefined, 'module2')
    })

    it('should get all logs', () => {
      const logs = logger.getLogs()
      expect(logs).toHaveLength(4)
    })

    it('should get logs by level', () => {
      const debugLogs = logger.getLogsByLevel(LogLevel.DEBUG)
      const errorLogs = logger.getLogsByLevel(LogLevel.ERROR)

      expect(debugLogs).toHaveLength(1)
      expect(errorLogs).toHaveLength(1)
    })

    it('should get logs by module', () => {
      const module1Logs = logger.getLogsByModule('module1')
      const module2Logs = logger.getLogsByModule('module2')

      expect(module1Logs).toHaveLength(2)
      expect(module2Logs).toHaveLength(2)
    })

    it('should return empty array for non-existent module', () => {
      const logs = logger.getLogsByModule('non-existent')
      expect(logs).toEqual([])
    })

    it('should return log count', () => {
      expect(logger.getLogCount()).toBe(4)
    })
  })

  describe('Log Clearing', () => {
    it('should clear all logs', () => {
      logger.info('Message 1')
      logger.info('Message 2')
      logger.info('Message 3')

      expect(logger.getLogCount()).toBe(3)

      logger.clear()

      expect(logger.getLogCount()).toBe(0)
      expect(logger.getLogs()).toEqual([])
    })

    it('should allow logging after clearing', () => {
      logger.info('Before clear')
      logger.clear()
      logger.info('After clear')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].message).toBe('After clear')
    })
  })

  describe('Timestamps', () => {
    it('should add timestamp to logs', () => {
      const before = new Date()
      logger.info('Test message')
      const after = new Date()

      const logs = logger.getLogs()
      const timestamp = logs[0].timestamp

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should have different timestamps for consecutive logs', () => {
      logger.info('Message 1')
      logger.info('Message 2')

      const logs = logger.getLogs()
      const time1 = logs[0].timestamp.getTime()
      const time2 = logs[1].timestamp.getTime()

      expect(time2).toBeGreaterThanOrEqual(time1)
    })
  })

  describe('Console Output', () => {
    it('should output to console when enabled', () => {
      const logger = new Logger(LogLevel.DEBUG, true)

      logger.info('Test message')

      expect(console.log).toHaveBeenCalled()
    })

    it('should not output to console when disabled', () => {
      const logger = new Logger(LogLevel.DEBUG, false)

      logger.info('Test message')

      expect(console.log).not.toHaveBeenCalled()
    })

    it('should use appropriate console method for each level', () => {
      const logger = new Logger(LogLevel.DEBUG, true)

      logger.debug('Debug')
      logger.info('Info')
      logger.warn('Warning')
      logger.error('Error')

      expect(console.debug).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalled()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('Logger Factories', () => {
    it('should create production logger with WARN level', () => {
      const logger = createProductionLogger()

      logger.info('Should not log')
      logger.warn('Should log')

      expect(logger.getLogCount()).toBe(1)
    })

    it('should create development logger with DEBUG level', () => {
      const logger = createDevelopmentLogger()

      logger.debug('Should log')
      logger.info('Should log')

      expect(logger.getLogCount()).toBe(2)
    })

    it('should create test logger with INFO level', () => {
      const logger = createTestLogger()

      logger.debug('Should not log')
      logger.info('Should log')

      expect(logger.getLogCount()).toBe(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty messages', () => {
      logger.info('')

      const logs = logger.getLogs()
      expect(logs[0].message).toBe('')
    })

    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000)
      logger.info(longMessage)

      const logs = logger.getLogs()
      expect(logs[0].message).toBe(longMessage)
    })

    it('should handle special characters in messages', () => {
      const message = 'Message with special chars: \n\t\r"\'`'
      logger.info(message)

      const logs = logger.getLogs()
      expect(logs[0].message).toBe(message)
    })

    it('should handle unicode in messages', () => {
      const message = '日本語 🎉 Emoji'
      logger.info(message)

      const logs = logger.getLogs()
      expect(logs[0].message).toBe(message)
    })

    it('should handle circular references in context', () => {
      const circular: Record<string, unknown> = { name: 'test' }
      circular.self = circular

      // Should not throw
      expect(() => {
        logger.info('Circular reference', circular)
      }).not.toThrow()
    })

    it('should handle null context', () => {
      logger.info('Message', undefined)

      const logs = logger.getLogs()
      expect(logs[0].context).toBeUndefined()
    })
  })

  describe('Real-world Scenarios', () => {
    it('should log API request flow', () => {
      logger.info(
        'API request received',
        {
          method: 'POST',
          path: '/api/courses',
        },
        'api'
      )

      logger.info(
        'Validating request body',
        {
          fields: ['name', 'school', 'term'],
        },
        'validation'
      )

      logger.info(
        'Creating course in database',
        {
          userId: 'user-123',
        },
        'database'
      )

      logger.info(
        'Course created successfully',
        {
          courseId: 'course-456',
        },
        'api'
      )

      const logs = logger.getLogs()
      expect(logs).toHaveLength(4)
      expect(logger.getLogsByModule('api')).toHaveLength(2)
      expect(logger.getLogsByModule('validation')).toHaveLength(1)
      expect(logger.getLogsByModule('database')).toHaveLength(1)
    })

    it('should log error handling flow', () => {
      try {
        throw new Error('Database connection failed')
      } catch (error) {
        logger.error(
          'Failed to create course',
          error,
          {
            userId: 'user-123',
            courseData: { name: 'Test Course' },
          },
          'database'
        )
      }

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe(LogLevel.ERROR)
      expect(logs[0].context?.userId).toBe('user-123')
      expect(logs[0].context?.error).toBeDefined()
    })

    it('should log authentication flow', () => {
      logger.info('Login attempt', { email: 'user@example.com' }, 'auth')
      logger.warn('Invalid password', { attempts: 1 }, 'auth')
      logger.warn('Invalid password', { attempts: 2 }, 'auth')
      logger.error('Account locked', { reason: 'too many attempts' }, 'auth')

      const authLogs = logger.getLogsByModule('auth')
      expect(authLogs).toHaveLength(4)
      expect(authLogs.filter((l) => l.level === LogLevel.WARN)).toHaveLength(2)
      expect(authLogs.filter((l) => l.level === LogLevel.ERROR)).toHaveLength(1)
    })
  })
})
