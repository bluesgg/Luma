import bcrypt from 'bcryptjs'
import { SECURITY } from './constants'

/**
 * Password hashing and verification utilities using bcryptjs
 */

const BCRYPT_ROUNDS = 10

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  // Validate input
  if (password === null || password === undefined) {
    throw new Error('Password cannot be null or undefined')
  }

  if (typeof password !== 'string') {
    throw new Error('Password must be a string')
  }

  if (password.length === 0) {
    throw new Error('Password cannot be empty')
  }

  // Reject passwords with only whitespace
  if (password.trim().length === 0) {
    throw new Error('Password cannot contain only whitespace')
  }

  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  // Validate password input
  if (password === null || password === undefined) {
    throw new Error('Password cannot be null or undefined')
  }

  if (typeof password !== 'string') {
    throw new Error('Password must be a string')
  }

  // Empty password should return false, not throw
  if (password.length === 0) {
    return false
  }

  // Validate hash input
  if (!hash || typeof hash !== 'string') {
    throw new Error('Invalid hash format')
  }

  try {
    return await bcrypt.compare(password, hash)
  } catch {
    // If bcrypt throws an error (e.g., invalid hash format), throw it
    throw new Error('Invalid hash format')
  }
}

/**
 * Check if a password meets minimum strength requirements
 */
export function isStrongPassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false
  }

  // Minimum 8 characters
  return password.length >= SECURITY.PASSWORD_MIN_LENGTH
}

/**
 * Calculate password strength
 * Returns 'weak', 'medium', or 'strong'
 */
export function getPasswordStrength(
  password: string
): 'weak' | 'medium' | 'strong' {
  if (!password || typeof password !== 'string') {
    return 'weak'
  }

  let score = 0

  // Length scoring
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length >= 16) score++

  // Character variety
  if (/[a-z]/.test(password)) score++ // lowercase
  if (/[A-Z]/.test(password)) score++ // uppercase
  if (/[0-9]/.test(password)) score++ // numbers
  if (/[^a-zA-Z0-9]/.test(password)) score++ // special characters

  // Determine strength based on score
  if (score <= 3) return 'weak'
  if (score <= 5) return 'medium'
  return 'strong'
}
