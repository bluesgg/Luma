import { z } from 'zod'

/**
 * Environment variables validation
 */

const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']),

  // Application
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'Supabase service role key is required'),

  // AI Services (optional for Phase 0)
  OPENROUTER_API_KEY: z.string().optional(),
  MATHPIX_APP_ID: z.string().optional(),
  MATHPIX_APP_KEY: z.string().optional(),

  // Cloudflare R2 (optional for Phase 0)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Trigger.dev (optional for Phase 0)
  TRIGGER_API_KEY: z.string().optional(),
  TRIGGER_API_URL: z.string().url().optional(),
  TRIGGER_SECRET_KEY: z.string().optional(),

  // Admin
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().optional(),

  // Security
  CSRF_SECRET: z.string().optional(),
  SESSION_SECRET: z.string().optional(),

  // Monitoring (Sentry)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validate environment variables
 * Required fields will cause process to exit, optional fields will only warn
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      process.exit(1)
    }
    throw error
  }
}

export const env = validateEnv()

/**
 * Check if required services are configured
 */
export function checkRequiredServices() {
  const missing: string[] = []

  // Check database
  if (!env.DATABASE_URL || !env.DIRECT_URL) {
    missing.push('Database (DATABASE_URL, DIRECT_URL)')
  }

  // Check Supabase
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push(
      'Supabase (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    )
  }

  if (missing.length > 0) {
    console.warn('⚠️  Missing configuration for:', missing.join(', '))
    console.warn('⚠️  Some features may not work correctly.')
  }
}

// Run check on import (only in development)
if (env.NODE_ENV === 'development') {
  checkRequiredServices()
}
