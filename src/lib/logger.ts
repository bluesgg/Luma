type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  action?: string
  errorCode?: string
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  error?: {
    name: string
    message: string
    stack?: string
  }
  context?: LogContext
}

function formatLogEntry(
  level: LogLevel,
  message: string,
  error?: Error,
  context?: LogContext
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        // Only include stack in development
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
      },
    }),
    ...(context && { context }),
  }
}

function log(
  level: LogLevel,
  message: string,
  error?: Error,
  context?: LogContext
): void {
  const entry = formatLogEntry(level, message, error, context)

  if (process.env.NODE_ENV === 'production') {
    // JSON format for production (easy to parse by log aggregators)
    const output = JSON.stringify(entry)
    switch (level) {
      case 'error':
        console.error(output)
        break
      case 'warn':
        console.warn(output)
        break
      default:
        console.log(output)
    }
  } else {
    // Readable format for development
    const prefix = `[${level.toUpperCase()}]`
    switch (level) {
      case 'error':
        console.error(prefix, message, error ?? '', context ?? '')
        break
      case 'warn':
        console.warn(prefix, message, context ?? '')
        break
      case 'info':
        console.info(prefix, message, context ?? '')
        break
      default:
        console.log(prefix, message, context ?? '')
    }
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV !== 'production') {
      log('debug', message, undefined, context)
    }
  },

  info: (message: string, context?: LogContext) => {
    log('info', message, undefined, context)
  },

  warn: (message: string, context?: LogContext) => {
    log('warn', message, undefined, context)
  },

  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    const err = error instanceof Error ? error : undefined
    log('error', message, err, context)
  },
}
