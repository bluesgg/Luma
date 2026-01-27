import { randomBytes } from 'crypto'
import prisma from './prisma'
import type { TokenType } from '@prisma/client'
import { SECURITY } from './constants'

/**
 * Token generation and validation utilities
 */

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(): string {
  // Generate 32 bytes (256 bits) of random data
  // Convert to URL-safe base64 string
  return randomBytes(32).toString('base64url')
}

/**
 * Generate a verification token and store it in database
 */
export async function generateVerificationToken(
  userId: string,
  type: TokenType
): Promise<{ token: string; expiresAt: Date }> {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error('Invalid user ID')
  }

  const token = generateToken()
  const expiresAt = new Date(
    Date.now() + SECURITY.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  )

  await prisma.verificationToken.create({
    data: {
      userId,
      token,
      type,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

/**
 * Validate a token and return token details if valid
 */
export async function validateToken(token: string): Promise<{
  isValid: boolean
  token?: {
    id: string
    userId: string
    type: TokenType
    expiresAt: Date
    usedAt: Date | null
  }
}> {
  // Validate input
  if (token === null || token === undefined) {
    throw new Error('Token cannot be null or undefined')
  }

  if (typeof token !== 'string' || token.length === 0) {
    return { isValid: false }
  }

  try {
    // Find token in database
    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { token },
    })

    // Token doesn't exist
    if (!tokenRecord) {
      return { isValid: false }
    }

    // Token already used
    if (tokenRecord.usedAt !== null) {
      return { isValid: false }
    }

    // Token expired
    if (new Date() > tokenRecord.expiresAt) {
      return { isValid: false }
    }

    // Token is valid
    return {
      isValid: true,
      token: {
        id: tokenRecord.id,
        userId: tokenRecord.userId,
        type: tokenRecord.type,
        expiresAt: tokenRecord.expiresAt,
        usedAt: tokenRecord.usedAt,
      },
    }
  } catch {
    // Database error or other issues
    return { isValid: false }
  }
}

/**
 * Mark a token as used
 */
export async function markTokenAsUsed(tokenId: string): Promise<void> {
  if (!tokenId || typeof tokenId !== 'string') {
    throw new Error('Invalid token ID')
  }

  try {
    await prisma.verificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    })
  } catch {
    throw new Error('Failed to mark token as used')
  }
}

/**
 * Invalidate all tokens of a specific type for a user
 */
export async function invalidateUserTokens(
  userId: string,
  type: TokenType
): Promise<void> {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error('Invalid user ID')
  }

  await prisma.verificationToken.updateMany({
    where: {
      userId,
      type,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  })
}
