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
 * Check if account is locked
 */
export function isAccountLocked(user: User): boolean {
  if (!user.lockedUntil) return false
  return new Date(user.lockedUntil) > new Date()
}
