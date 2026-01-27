/**
 * Trigger.dev Client Configuration
 */

import { env } from '@/lib/env'

/**
 * Check if Trigger.dev is configured
 */
export function isTriggerConfigured(): boolean {
  return !!env.TRIGGER_API_KEY && !!env.TRIGGER_API_URL
}

/**
 * Get Trigger.dev configuration
 */
export function getTriggerConfig() {
  if (!isTriggerConfigured()) {
    return null
  }

  // Type assertion is safe here because isTriggerConfigured() checks for these values
  return {
    id: 'luma-web',
    apiKey: env.TRIGGER_API_KEY!,
    apiUrl: env.TRIGGER_API_URL!,
  }
}
