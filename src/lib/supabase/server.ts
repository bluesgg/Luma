import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { supabaseConfig } from '@/lib/env'

/**
 * Create a Supabase client for server-side operations.
 * Uses cookie-based session management via @supabase/ssr.
 * This client respects RLS policies based on the authenticated user.
 *
 * Usage in Server Components or Route Handlers:
 * ```ts
 * const supabase = await createClient()
 * const { data: { user } } = await supabase.auth.getUser()
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}

/**
 * Create a Supabase client with service role privileges.
 * This client bypasses RLS policies and should only be used for:
 * - Admin operations
 * - Background tasks (cron jobs)
 * - Webhook handlers
 *
 * WARNING: Never expose this client to the browser or use it in client components.
 *
 * Usage:
 * ```ts
 * const supabase = createServiceClient()
 * const { data } = await supabase.from('users').select('*')
 * ```
 */
export function createServiceClient() {
  if (!supabaseConfig.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service client')
  }

  return createSupabaseClient(
    supabaseConfig.url,
    supabaseConfig.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
