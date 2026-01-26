import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { AUTH, QUOTA } from '@/lib/constants'
import { sanitizeUserAgent, sanitizeMetadata } from '@/lib/sanitize'
import type { AppErrorCode, ApiSuccessResponse, ApiErrorResponse } from '@/types'

// Email validation using Zod for robust validation
const emailSchema = z.string().email()

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  return password.length >= AUTH.PASSWORD_MIN_LENGTH
}

/**
 * Create a standardized error response
 */
export function createAuthError(
  code: AppErrorCode,
  message: string
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message },
  }
}

/**
 * Create a standardized success response
 */
export function createAuthSuccess<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  }
}

/**
 * Get current authenticated user from session
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Get current user and verify admin role
 * Returns null if user is not authenticated or not an admin
 */
export async function getCurrentAdmin() {
  const user = await getCurrentUser()
  if (!user) return null

  const profile = await getUserProfile(user.id)
  if (!profile || profile.role !== 'admin') return null

  return { user, profile }
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId: string) {
  return prisma.profile.findUnique({
    where: { userId },
    include: {
      quotas: true,
      preference: true,
    },
  })
}

/**
 * Create profile and quota records for new user
 */
export async function createUserProfile(userId: string) {
  const now = new Date()
  const nextMonth = new Date(now)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  // Use transaction to ensure atomicity
  return prisma.$transaction(async (tx) => {
    // Create profile
    const profile = await tx.profile.create({
      data: {
        userId,
        role: 'student',
      },
    })

    // Create learning interactions quota
    await tx.quota.create({
      data: {
        userId,
        bucket: 'learningInteractions',
        used: 0,
        limit: QUOTA.LEARNING_INTERACTIONS_LIMIT,
        resetAt: nextMonth,
      },
    })

    // Create auto explain quota
    await tx.quota.create({
      data: {
        userId,
        bucket: 'autoExplain',
        used: 0,
        limit: QUOTA.AUTO_EXPLAIN_LIMIT,
        resetAt: nextMonth,
      },
    })

    return profile
  })
}

/**
 * Record login access log with sanitized metadata
 */
export async function recordLoginLog(
  userId: string,
  metadata?: Record<string, unknown>
) {
  // Sanitize metadata to prevent log injection and XSS
  let sanitizedMetadata: Prisma.InputJsonValue | undefined

  if (metadata) {
    const cleanMetadata: Record<string, unknown> = {}

    // Sanitize known fields
    if (typeof metadata.userAgent === 'string') {
      cleanMetadata.userAgent = sanitizeUserAgent(metadata.userAgent)
    }
    if (typeof metadata.rememberMe === 'boolean') {
      cleanMetadata.rememberMe = metadata.rememberMe
    }

    // Sanitize any other fields
    const otherFields = Object.keys(metadata).filter(
      (k) => k !== 'userAgent' && k !== 'rememberMe'
    )
    if (otherFields.length > 0) {
      const otherMetadata: Record<string, unknown> = {}
      for (const key of otherFields) {
        otherMetadata[key] = metadata[key]
      }
      Object.assign(cleanMetadata, sanitizeMetadata(otherMetadata))
    }

    sanitizedMetadata = cleanMetadata as Prisma.InputJsonValue
  }

  return prisma.accessLog.create({
    data: {
      userId,
      actionType: 'login',
      metadata: sanitizedMetadata,
    },
  })
}

/**
 * Calculate next quota reset date based on registration anniversary
 */
export function calculateNextResetDate(registrationDate: Date): Date {
  const now = new Date()
  const resetDay = registrationDate.getDate()

  let nextReset = new Date(now.getFullYear(), now.getMonth(), resetDay)

  // If this month's reset day has passed, move to next month
  if (nextReset <= now) {
    nextReset.setMonth(nextReset.getMonth() + 1)
  }

  // Handle edge case where day doesn't exist in month (e.g., Jan 31 -> Feb 28)
  if (nextReset.getDate() !== resetDay) {
    // Set to last day of previous month
    nextReset = new Date(nextReset.getFullYear(), nextReset.getMonth(), 0)
  }

  return nextReset
}
