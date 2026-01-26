import { createBrowserClient } from '@supabase/ssr'
import { clientEnv } from '@/lib/env'

/**
 * Create a Supabase client for browser-side operations.
 * Uses cookie-based session management via @supabase/ssr.
 *
 * Usage:
 * ```ts
 * const supabase = createClient()
 * const { data: { user } } = await supabase.auth.getUser()
 * ```
 */
export function createClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
