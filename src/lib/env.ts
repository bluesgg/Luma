/**
 * Type-safe environment variable access
 *
 * This module provides validated access to environment variables with proper typing.
 * All required env vars are checked at build time to prevent runtime errors.
 */

import { z } from 'zod'

// Define the schema for environment variables
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // AI Services (Claude) - Optional for Phase 0-3, required for Phase 4+
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  TUTOR_SKILL_ID: z.string().min(1).optional(),

  // Trigger.dev - Optional for Phase 0-2, required for Phase 3+
  TRIGGER_API_KEY: z.string().min(1).optional(),
  TRIGGER_API_URL: z.string().url().optional(),

  // Admin
  SUPER_ADMIN_EMAIL: z.string().email(),
  SUPER_ADMIN_PASSWORD_HASH: z.string().min(1),

  // Email (Resend) - Optional for Phase 0, required for Phase 1+
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),

  // Security
  CSRF_SECRET: z.string().min(32),
  SESSION_SECRET: z.string().min(32),

  // Monitoring (Sentry) - Optional
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  // Development
  DEBUG: z
    .string()
    .optional()
    .transform(val => val === 'true'),
  SKIP_EMAIL_VERIFICATION: z
    .string()
    .optional()
    .transform(val => val === 'true'),
})

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(err => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n')

      throw new Error(
        `❌ Invalid environment variables:\n${missingVars}\n\nPlease check your .env file against .env.example`
      )
    }
    throw error
  }
}

// Export validated environment variables
export const env = parseEnv()

// Helper to check if we're in production
export const isProd = env.NODE_ENV === 'production'
export const isDev = env.NODE_ENV === 'development'
export const isTest = env.NODE_ENV === 'test'
