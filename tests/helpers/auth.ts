import { User, VerificationToken } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

/**
 * Test helper utilities for authentication tests
 */

export interface CreateTestUserParams {
  email?: string;
  password?: string;
  emailVerified?: boolean;
  failedLoginCount?: number;
  lockedUntil?: Date | null;
}

export interface TestUserData {
  user: User;
  password: string;
}

/**
 * Creates a test user in the database
 */
export async function createTestUser(
  params: CreateTestUserParams = {}
): Promise<TestUserData> {
  const {
    email = `test-${Date.now()}@example.com`,
    password = 'Test123!@#',
    emailVerified = false,
    failedLoginCount = 0,
    lockedUntil = null,
  } = params;

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      emailVerified,
      failedLoginCount,
      lockedUntil,
    },
  });

  return { user, password };
}

/**
 * Deletes a test user and all related data
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await prisma.user.delete({
    where: { id: userId },
  });
}

/**
 * Deletes all test users (for cleanup)
 */
export async function deleteAllTestUsers(): Promise<void> {
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test-',
      },
    },
  });
}

/**
 * Creates a verification token for a user
 */
export async function createTestVerificationToken(
  userId: string,
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' = 'EMAIL_VERIFICATION',
  expiresInHours: number = 24
): Promise<VerificationToken> {
  const token = `test-token-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  return await prisma.verificationToken.create({
    data: {
      userId,
      token,
      type,
      expiresAt,
    },
  });
}

/**
 * Creates an expired verification token
 */
export async function createExpiredToken(
  userId: string,
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' = 'EMAIL_VERIFICATION'
): Promise<VerificationToken> {
  const token = `expired-token-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() - 1); // Expired 1 hour ago

  return await prisma.verificationToken.create({
    data: {
      userId,
      token,
      type,
      expiresAt,
    },
  });
}

/**
 * Locks a user account
 */
export async function lockUserAccount(
  userId: string,
  lockDurationMinutes: number = 30
): Promise<User> {
  const lockedUntil = new Date();
  lockedUntil.setMinutes(lockedUntil.getMinutes() + lockDurationMinutes);

  return await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 5,
      lockedUntil,
    },
  });
}

/**
 * Unlocks a user account
 */
export async function unlockUserAccount(userId: string): Promise<User> {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
}

/**
 * Verifies a user's email
 */
export async function verifyUserEmail(userId: string): Promise<User> {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerified: true,
    },
  });
}

/**
 * Gets user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Increments failed login count
 */
export async function incrementFailedLoginCount(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: user.failedLoginCount + 1,
    },
  });
}

/**
 * Mock request helper
 */
export function createMockRequest(
  method: string,
  body?: any,
  headers?: Record<string, string>
): Request {
  return new Request('http://localhost:3000', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Mock NextRequest helper for middleware
 */
export function createMockNextRequest(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  }
): any {
  const headers = new Headers(options?.headers || {});
  const cookies = new Map(Object.entries(options?.cookies || {}));

  return {
    url,
    method: options?.method || 'GET',
    headers,
    cookies: {
      get: (name: string) => cookies.get(name),
      set: (name: string, value: string) => cookies.set(name, value),
      delete: (name: string) => cookies.delete(name),
    },
    nextUrl: new URL(url),
  };
}
