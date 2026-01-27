/**
 * Application Logger with Sentry Integration
 * Provides structured logging with automatic error reporting
 */

import { captureError, addBreadcrumb } from './sentry'

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

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  /**
   * Format log entry for structured logging
   */
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

  /**
   * Get trace ID for request correlation
   */
  private getTraceId(): string | undefined {
    // In production, you might get this from headers or generate one
    return undefined
  }

  /**
   * Output log based on environment
   */
  private output(entry: LogEntry): void {
    if (this.isProduction) {
      // In production, output JSON for log aggregation
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(entry))
    } else {
      // In development, output human-readable format
      const contextStr = entry.context
        ? ` ${JSON.stringify(entry.context)}`
        : ''
      // eslint-disable-next-line no-console
      console.log(
        `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}`
      )
    }
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.output(this.formatEntry('debug', message, context))
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    this.output(this.formatEntry('info', message, context))

    // Add breadcrumb for Sentry
    addBreadcrumb(message, 'info', context)
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    this.output(this.formatEntry('warn', message, context))

    // Add breadcrumb for Sentry
    addBreadcrumb(message, 'warning', context)
  }

  /**
   * Error level logging with Sentry reporting
   */
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

    // Report to Sentry in production
    if (this.isProduction && error) {
      if (error instanceof Error) {
        captureError(error, { message, ...context })
      } else {
        // Convert non-Error exceptions to Error for Sentry
        const syntheticError = new Error(
          `Non-Error exception: ${String(error)}`
        )
        captureError(syntheticError, {
          message,
          originalError: error,
          ...context,
        })
      }
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

export const logger = new Logger()

/**
 * Performance logging utility
 */
export function logPerformance(
  operation: string,
  startTime: number,
  context?: LogContext
): void {
  const duration = Date.now() - startTime
  logger.debug(`Performance: ${operation}`, { duration, ...context })

  // Add performance breadcrumb
  addBreadcrumb(`Performance: ${operation}`, 'performance', {
    duration,
    ...context,
  })
}

/**
 * Request logging utility
 */
export function logRequest(
  method: string,
  path: string,
  userId?: string,
  statusCode?: number
): void {
  logger.api(`${method} ${path}`, { userId, statusCode })
}

/**
 * Error reporter with Sentry integration
 */
export function reportError(error: Error, context?: LogContext): void {
  logger.error('Unexpected error', error, context)
}

/**
 * Create a child logger with preset context
 */
export function createLogger(baseContext: LogContext) {
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
