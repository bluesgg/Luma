/**
 * Sanitize user agent string for safe storage
 * - Limits length to prevent log bloat
 * - Removes control characters
 * - Removes HTML special characters to prevent XSS
 */
export function sanitizeUserAgent(userAgent: string | null): string | null {
  if (!userAgent) return null

  return userAgent
    .slice(0, 500) // Limit length
    .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
    .replace(/[<>"'&]/g, '') // Remove HTML special characters
}

/**
 * Sanitize a string value
 * - Removes control characters
 * - Removes HTML special characters
 */
export function sanitizeString(value: string, maxLength = 1000): string {
  return value
    .slice(0, maxLength)
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[<>"'&]/g, '')
}

/**
 * Sanitize file name for safe storage and URL usage
 * - Removes path traversal characters (../, ..\, etc.)
 * - Removes control characters
 * - Removes special characters that can cause issues
 * - Preserves file extension
 * - Limits length to 255 characters
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\.[/\\]/g, '')

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '')

  // Remove potentially dangerous characters but keep: alphanumeric, spaces, dots, dashes, underscores, parentheses
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s.\-_()]/g, '')

  // Collapse multiple spaces into one
  sanitized = sanitized.replace(/\s+/g, ' ')

  // Trim whitespace
  sanitized = sanitized.trim()

  // Limit length to 255 characters (filesystem limit)
  if (sanitized.length > 255) {
    // Preserve file extension if possible
    const lastDotIndex = sanitized.lastIndexOf('.')
    if (lastDotIndex > 0 && lastDotIndex > sanitized.length - 10) {
      const extension = sanitized.slice(lastDotIndex)
      const nameWithoutExt = sanitized.slice(0, lastDotIndex)
      sanitized = nameWithoutExt.slice(0, 255 - extension.length) + extension
    } else {
      sanitized = sanitized.slice(0, 255)
    }
  }

  // If everything was stripped, provide a default name
  if (!sanitized || sanitized === '.') {
    sanitized = 'unnamed-file.pdf'
  }

  return sanitized
}

/**
 * Deep sanitize an object for safe storage as JSON metadata
 * - Recursively sanitizes all string values
 * - Limits object depth to prevent stack overflow
 */
export function sanitizeMetadata<T extends Record<string, unknown>>(
  metadata: T,
  maxDepth = 5
): T {
  if (maxDepth <= 0) {
    return {} as T
  }

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(metadata)) {
    // Sanitize the key itself
    const sanitizedKey = sanitizeString(key, 100)

    if (typeof value === 'string') {
      result[sanitizedKey] = sanitizeString(value)
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[sanitizedKey] = value
    } else if (value === null || value === undefined) {
      result[sanitizedKey] = value
    } else if (Array.isArray(value)) {
      result[sanitizedKey] = value.slice(0, 100).map((item) => {
        if (typeof item === 'string') return sanitizeString(item)
        if (typeof item === 'object' && item !== null) {
          return sanitizeMetadata(item as Record<string, unknown>, maxDepth - 1)
        }
        return item
      })
    } else if (typeof value === 'object') {
      result[sanitizedKey] = sanitizeMetadata(
        value as Record<string, unknown>,
        maxDepth - 1
      )
    }
    // Skip functions and other types
  }

  return result as T
}
