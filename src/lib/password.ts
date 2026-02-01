import * as bcrypt from 'bcryptjs';

/**
 * Password utilities for hashing and verification
 * Uses bcrypt with cost factor 10 (salt rounds)
 */

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * @param password - Plain text password to hash
 * @returns Promise<string> - Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns Promise<boolean> - True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
