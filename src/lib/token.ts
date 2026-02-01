import { randomBytes } from 'crypto';

/**
 * Token generation and validation utilities
 * Uses cryptographically secure random generation
 */

/**
 * Generate a cryptographically secure random token
 * @param bytes - Number of random bytes to generate (default: 32)
 * @returns Hex-encoded token string
 */
export function generateToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Check if a token has expired
 * @param expiresAt - Expiration date to check
 * @returns True if token is expired (current time >= expiresAt)
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() >= expiresAt;
}

/**
 * Create an expiration date for email verification (24 hours from now)
 * @returns Date object 24 hours in the future
 */
export function createEmailVerificationExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  return expiresAt;
}

/**
 * Create an expiration date for password reset (1 hour from now)
 * @returns Date object 1 hour in the future
 */
export function createPasswordResetExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  return expiresAt;
}
