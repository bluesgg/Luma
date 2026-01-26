import { z } from 'zod'

/**
 * Server-side environment variables schema
 * These are validated at runtime (lazy initialization)
 */
const serverEnvSchema = z.object({
  // Supabase (public - available client-side)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Supabase (server-only)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('luma-files'),

  // AI
  OPENROUTER_API_KEY: z.string().min(1).optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // CRON
  CRON_SECRET: z.string().min(1).optional(),
})

/**
 * Client-side environment variables schema
 * Only NEXT_PUBLIC_ prefixed variables are available in browser
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>

// Cache for validated environment
let _serverEnv: ServerEnv | null = null
let _clientEnv: ClientEnv | null = null

/**
 * Get validated server environment variables
 * Throws if validation fails (at runtime, not build time)
 */
function getServerEnv(): ServerEnv {
  if (_serverEnv) return _serverEnv

  const parsed = serverEnvSchema.safeParse(process.env)

  if (!parsed.success) {
    // During build, Next.js may not have all env vars
    // Only throw at runtime
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
      console.error(
        '[ENV] Invalid server environment variables:',
        Object.keys(parsed.error.flatten().fieldErrors)
      )
    }
    throw new Error('Invalid server environment variables')
  }

  _serverEnv = parsed.data
  return _serverEnv
}

/**
 * Get validated client environment variables
 * Throws if validation fails
 */
function getClientEnv(): ClientEnv {
  if (_clientEnv) return _clientEnv

  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })

  if (!parsed.success) {
    console.error(
      '[ENV] Invalid client environment variables:',
      Object.keys(parsed.error.flatten().fieldErrors)
    )
    throw new Error('Invalid client environment variables')
  }

  _clientEnv = parsed.data
  return _clientEnv
}

// Lazy getters to avoid validation at import time
export const serverEnv = new Proxy({} as ServerEnv, {
  get(_, prop: keyof ServerEnv) {
    return getServerEnv()[prop]
  },
})

export const clientEnv = new Proxy({} as ClientEnv, {
  get(_, prop: keyof ClientEnv) {
    return getClientEnv()[prop]
  },
})

// Convenience accessors for common use cases (also lazy)
export const supabaseConfig = {
  get url() {
    return getServerEnv().NEXT_PUBLIC_SUPABASE_URL
  },
  get anonKey() {
    return getServerEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY
  },
  get serviceRoleKey() {
    return getServerEnv().SUPABASE_SERVICE_ROLE_KEY
  },
}

export const openRouterConfig = {
  get apiKey() {
    return getServerEnv().OPENROUTER_API_KEY
  },
}

export const cronConfig = {
  get secret() {
    return getServerEnv().CRON_SECRET
  },
}

export const storageConfig = {
  get bucket() {
    return getServerEnv().SUPABASE_STORAGE_BUCKET
  },
}
