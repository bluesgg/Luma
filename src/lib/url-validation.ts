/**
 * Allowed origins for redirect URLs
 * In production, only include your actual domains
 */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:4000',
  'https://luma.app',
  'https://www.luma.app',
  // Add other trusted domains as needed
]

/**
 * Validate that a URL is safe for redirects
 * Prevents open redirect vulnerabilities
 */
export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    // Check if origin is in whitelist
    const origin = `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`

    return ALLOWED_ORIGINS.some((allowed) => {
      // Exact match
      if (allowed === origin) return true

      // Allow subdomains for production domains
      if (allowed.startsWith('https://') && origin.startsWith('https://')) {
        const allowedHost = new URL(allowed).hostname
        const originHost = parsed.hostname
        return originHost === allowedHost || originHost.endsWith('.' + allowedHost)
      }

      return false
    })
  } catch {
    return false
  }
}

/**
 * Get validated redirect URL or throw error
 */
export function getValidatedRedirectUrl(baseUrl: string, path: string): string {
  const fullUrl = `${baseUrl}${path}`

  if (!isValidRedirectUrl(fullUrl)) {
    throw new Error(
      `Invalid redirect URL: ${fullUrl}. URL must be from an allowed origin.`
    )
  }

  return fullUrl
}
