import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { prisma } from './prisma';
import type { User } from '@prisma/client';

/**
 * Authentication utilities
 * Provides functions for user session management and authentication
 */

// Validate SESSION_SECRET exists in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required in production');
}

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-change-me'
);

/**
 * Get the current authenticated user from JWT session
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return null;
    }

    // Verify JWT token
    const { payload } = await jwtVerify(sessionToken, SESSION_SECRET);
    const userId = payload.userId as string;

    if (!userId) {
      return null;
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return user;
  } catch (error) {
    // Token invalid or expired
    return null;
  }
}

/**
 * Get the current session payload
 * @returns Session payload or null
 */
export async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return null;
    }

    const { payload } = await jwtVerify(sessionToken, SESSION_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Require authentication - throws error if not authenticated
 * Use in API routes and server components that require auth
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Check if user is authenticated
 * @returns True if user has valid session
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Create a session for a user
 * @param userId - User ID to create session for
 * @param rememberMe - Whether to extend session duration
 */
export async function createSession(userId: string, rememberMe: boolean = false): Promise<void> {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 30 days or 7 days

  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAge)
    .sign(SESSION_SECRET);

  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

/**
 * Destroy the current session (logout)
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
