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
    return undefined
  }

  /**
   * Output log based on environment
   */
  private output(entry: LogEntry): void {
    if (this.isProduction) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(entry))
    } else {
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
    addBreadcrumb(message, 'info', context)
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    this.output(this.formatEntry('warn', message, context))
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

    if (this.isProduction && error) {
      if (error instanceof Error) {
        captureError(error, { message, ...context })
      } else {
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

  trigger(message: string, context?: LogContext): void {
    this.info(message, { ...context, _category: 'trigger' })
  }
}

export const logger = new Logger()
