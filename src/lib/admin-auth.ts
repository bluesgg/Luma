import { cookies } from 'next/headers'
import prisma from './prisma'
import type { Admin } from '@prisma/client'
import { ADMIN_SECURITY, ADMIN_ERROR_CODES } from './constants'
import { logger } from './logger'

/**
 * Admin session type (excluding sensitive data)
 */
export type AdminSession = Omit<Admin, 'passwordHash'>

/**
 * Get the current admin from the session
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(ADMIN_SECURITY.SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return null
    }

    const adminId = sessionCookie.value

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    })

    if (!admin) {
      return null
    }

    if (admin.disabledAt) {
      return null
    }

    const { passwordHash: _passwordHash, ...adminSession } = admin
    return adminSession
  } catch (error) {
    logger.error('Error getting admin session', error)
    return null
  }
}

/**
 * Require admin authentication - throws if not authenticated
 */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdminSession()

  if (!admin) {
    throw new Error(ADMIN_ERROR_CODES.ADMIN_UNAUTHORIZED)
  }

  if (admin.disabledAt) {
    throw new Error(ADMIN_ERROR_CODES.ADMIN_DISABLED)
  }

  return admin
}

/**
 * Set admin session cookie
 */
export async function setAdminSession(adminId: string): Promise<void> {
  const cookieStore = await cookies()
  const maxAge = ADMIN_SECURITY.SESSION_MAX_AGE_DAYS * 24 * 60 * 60

  cookieStore.set(ADMIN_SECURITY.SESSION_COOKIE_NAME, adminId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/admin',
  })
}

/**
 * Clear admin session cookie
 */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set(ADMIN_SECURITY.SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/admin',
  })
}

/**
 * Create audit log entry for admin actions
 */
export async function createAuditLog(
  adminId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        details: details ? (details as any) : undefined,
      },
    })
  } catch (error) {
    logger.error('Error creating audit log', error)
  }
}
