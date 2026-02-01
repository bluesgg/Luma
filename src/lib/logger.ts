/**
 * Logger utility
 * Provides structured logging for the application
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...context,
    };

    // In production, you would send to a logging service (e.g., Sentry, DataDog)
    if (process.env.NODE_ENV === 'production') {
      // For now, use console but format as JSON
      console.log(JSON.stringify(logData));
    } else {
      // In development, use regular console with colors
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      if (level === 'error') {
        console.error(prefix, message, context || '');
      } else if (level === 'warn') {
        console.warn(prefix, message, context || '');
      } else {
        console.log(prefix, message, context || '');
      }
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, context);
    }
  }
}

export const logger = new Logger();
