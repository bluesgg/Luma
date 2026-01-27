import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import prisma from './prisma'
import type { User } from '@prisma/client'
import { SECURITY } from './constants'
import { logger } from './logger'

/**
 * Get the current user from the session
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SECURITY.SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return null
    }

    const userId = sessionCookie.value

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    return user
  } catch (error) {
    logger.error('Error getting current user', error)
    return null
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}

/**
 * Require email verification
 */
export async function requireVerifiedEmail(): Promise<User> {
  const user = await requireAuth()

  if (!user.emailConfirmedAt) {
    throw new Error('Email not verified')
  }

  return user
}

/**
 * Check if user owns a resource
 */
export async function requireOwnership(resourceUserId: string): Promise<User> {
  const user = await requireAuth()

  if (user.id !== resourceUserId) {
    throw new Error('Forbidden')
  }

  return user
}

/**
 * Get user ID from request (for API routes)
 */
export async function getUserIdFromRequest(
  _request: NextRequest
): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.id || null
}

/**
 * Check if account is locked
 */
export function isAccountLocked(user: User): boolean {
  if (!user.lockedUntil) return false
  return new Date(user.lockedUntil) > new Date()
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
