/**
 * Supabase Client (Browser)
 *
 * For client-side operations (browser)
 */

import { createBrowserClient } from '@supabase/ssr'
import { env } from '../env'

export const createClient = () => {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
