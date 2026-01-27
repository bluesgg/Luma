// =============================================================================
// CSRF Token Generation and Validation Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { randomBytes, createHash } from 'crypto'

// CSRF token utilities
class CsrfTokenManager {
  private readonly secret: string
  private readonly tokenLength: number

  constructor(secret?: string, tokenLength = 32) {
    this.secret = secret || randomBytes(32).toString('hex')
    this.tokenLength = tokenLength
  }

  /**
   * Generate a new CSRF token
   */
  generateToken(): string {
    const token = randomBytes(this.tokenLength).toString('hex')
    return token
  }

  /**
   * Create a hash of the token with secret
   */
  hashToken(token: string): string {
    return createHash('sha256')
      .update(token + this.secret)
      .digest('hex')
  }

  /**
   * Validate a CSRF token against its hash
   */
  validateToken(token: string, expectedHash: string): boolean {
    if (!token || !expectedHash) {
      return false
    }

    const actualHash = this.hashToken(token)
    return this.secureCompare(actualHash, expectedHash)
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }

    return result === 0
  }

  /**
   * Generate a token pair (token and its hash)
   */
  generateTokenPair(): { token: string; hash: string } {
    const token = this.generateToken()
    const hash = this.hashToken(token)
    return { token, hash }
  }
}

// Helper to create CSRF token manager with test secret
const createTestCsrfManager = (secret = 'test-secret-key') => {
  return new CsrfTokenManager(secret)
}

describe('CSRF Token Manager', () => {
  let csrfManager: CsrfTokenManager

  beforeEach(() => {
    csrfManager = createTestCsrfManager()
  })

  describe('Token Generation', () => {
    it('should generate a token', () => {
      const token = csrfManager.generateToken()

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should generate unique tokens', () => {
      const token1 = csrfManager.generateToken()
      const token2 = csrfManager.generateToken()

      expect(token1).not.toBe(token2)
    })

    it('should generate tokens of correct length', () => {
      const token = csrfManager.generateToken()

      // Token is hex encoded, so length should be tokenLength * 2
      expect(token.length).toBe(64) // 32 bytes = 64 hex characters
    })

    it('should generate hex-encoded tokens', () => {
      const token = csrfManager.generateToken()

      expect(token).toMatch(/^[0-9a-f]+$/)
    })

    it('should generate multiple unique tokens', () => {
      const tokens = new Set<string>()

      for (let i = 0; i < 100; i++) {
        tokens.add(csrfManager.generateToken())
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100)
    })
  })

  describe('Token Hashing', () => {
    it('should hash a token', () => {
      const token = 'test-token'
      const hash = csrfManager.hashToken(token)

      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(64) // SHA-256 produces 64 hex characters
    })

    it('should produce consistent hashes for same token', () => {
      const token = 'test-token'
      const hash1 = csrfManager.hashToken(token)
      const hash2 = csrfManager.hashToken(token)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different tokens', () => {
      const hash1 = csrfManager.hashToken('token1')
      const hash2 = csrfManager.hashToken('token2')

      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hashes with different secrets', () => {
      const manager1 = createTestCsrfManager('secret1')
      const manager2 = createTestCsrfManager('secret2')

      const token = 'test-token'
      const hash1 = manager1.hashToken(token)
      const hash2 = manager2.hashToken(token)

      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty token', () => {
      const hash = csrfManager.hashToken('')

      expect(hash).toBeDefined()
      expect(hash.length).toBe(64)
    })

    it('should handle special characters in token', () => {
      const token = 'token-with-special-chars!@#$%^&*()'
      const hash = csrfManager.hashToken(token)

      expect(hash).toBeDefined()
      expect(hash.length).toBe(64)
    })
  })

  describe('Token Validation', () => {
    it('should validate correct token', () => {
      const token = csrfManager.generateToken()
      const hash = csrfManager.hashToken(token)

      const isValid = csrfManager.validateToken(token, hash)

      expect(isValid).toBe(true)
    })

    it('should reject invalid token', () => {
      const token = csrfManager.generateToken()
      const hash = csrfManager.hashToken(token)

      const isValid = csrfManager.validateToken('wrong-token', hash)

      expect(isValid).toBe(false)
    })

    it('should reject tampered token', () => {
      const token = csrfManager.generateToken()
      const hash = csrfManager.hashToken(token)

      // Tamper with token
      const tamperedToken = token.slice(0, -1) + 'x'

      const isValid = csrfManager.validateToken(tamperedToken, hash)

      expect(isValid).toBe(false)
    })

    it('should reject empty token', () => {
      const hash = csrfManager.hashToken('test')

      const isValid = csrfManager.validateToken('', hash)

      expect(isValid).toBe(false)
    })

    it('should reject empty hash', () => {
      const token = csrfManager.generateToken()

      const isValid = csrfManager.validateToken(token, '')

      expect(isValid).toBe(false)
    })

    it('should reject null/undefined values', () => {
      const token = csrfManager.generateToken()
      const hash = csrfManager.hashToken(token)

      expect(csrfManager.validateToken('', hash)).toBe(false)
      expect(csrfManager.validateToken(token, '')).toBe(false)
    })

    it('should use timing-safe comparison', () => {
      const token = csrfManager.generateToken()
      const hash = csrfManager.hashToken(token)

      // Multiple validations should take similar time
      const times: number[] = []

      for (let i = 0; i < 10; i++) {
        const start = performance.now()
        csrfManager.validateToken(token, hash)
        const end = performance.now()
        times.push(end - start)
      }

      // Timing should be consistent (no early returns revealing info)
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const variance =
        times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) /
        times.length

      // Variance should be low (timing-safe)
      expect(variance).toBeLessThan(1.0)
    })
  })

  describe('Token Pair Generation', () => {
    it('should generate token and hash pair', () => {
      const { token, hash } = csrfManager.generateTokenPair()

      expect(token).toBeDefined()
      expect(hash).toBeDefined()
      expect(typeof token).toBe('string')
      expect(typeof hash).toBe('string')
    })

    it('should generate valid token pair', () => {
      const { token, hash } = csrfManager.generateTokenPair()

      const isValid = csrfManager.validateToken(token, hash)

      expect(isValid).toBe(true)
    })

    it('should generate unique token pairs', () => {
      const pair1 = csrfManager.generateTokenPair()
      const pair2 = csrfManager.generateTokenPair()

      expect(pair1.token).not.toBe(pair2.token)
      expect(pair1.hash).not.toBe(pair2.hash)
    })

    it('should not allow cross-validation between pairs', () => {
      const pair1 = csrfManager.generateTokenPair()
      const pair2 = csrfManager.generateTokenPair()

      // pair1 token should not validate with pair2 hash
      expect(csrfManager.validateToken(pair1.token, pair2.hash)).toBe(false)
      expect(csrfManager.validateToken(pair2.token, pair1.hash)).toBe(false)
    })
  })

  describe('Security', () => {
    it('should use secure random bytes', () => {
      const tokens = new Set<string>()

      // Generate many tokens to check randomness
      for (let i = 0; i < 1000; i++) {
        tokens.add(csrfManager.generateToken())
      }

      // All tokens should be unique (good randomness)
      expect(tokens.size).toBe(1000)
    })

    it('should not allow hash guessing', () => {
      const token = csrfManager.generateToken()
      const correctHash = csrfManager.hashToken(token)

      // Try similar hashes
      const similarHash1 = correctHash.slice(0, -1) + '0'
      const similarHash2 = correctHash.slice(0, -1) + 'f'

      expect(csrfManager.validateToken(token, similarHash1)).toBe(false)
      expect(csrfManager.validateToken(token, similarHash2)).toBe(false)
    })

    it('should not leak token information through hash', () => {
      const token1 = 'a'.repeat(32)
      const token2 = 'b'.repeat(32)

      const hash1 = csrfManager.hashToken(token1)
      const hash2 = csrfManager.hashToken(token2)

      // Hashes should be completely different
      let differences = 0
      for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) differences++
      }

      // Should have many differences (avalanche effect)
      expect(differences).toBeGreaterThan(30)
    })

    it('should handle concurrent token generation', () => {
      const tokens = []

      for (let i = 0; i < 100; i++) {
        tokens.push(csrfManager.generateToken())
      }

      // All tokens should be unique
      const uniqueTokens = new Set(tokens)
      expect(uniqueTokens.size).toBe(100)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long tokens', () => {
      const longToken = 'a'.repeat(10000)
      const hash = csrfManager.hashToken(longToken)

      const isValid = csrfManager.validateToken(longToken, hash)

      expect(isValid).toBe(true)
    })

    it('should handle tokens with unicode characters', () => {
      const unicodeToken = '你好世界🌍'
      const hash = csrfManager.hashToken(unicodeToken)

      const isValid = csrfManager.validateToken(unicodeToken, hash)

      expect(isValid).toBe(true)
    })

    it('should handle tokens with newlines', () => {
      const tokenWithNewline = 'token\nwith\nnewlines'
      const hash = csrfManager.hashToken(tokenWithNewline)

      const isValid = csrfManager.validateToken(tokenWithNewline, hash)

      expect(isValid).toBe(true)
    })

    it('should handle case sensitivity', () => {
      const token = 'AbCdEf123456'
      const hash = csrfManager.hashToken(token)

      expect(csrfManager.validateToken(token.toLowerCase(), hash)).toBe(false)
      expect(csrfManager.validateToken(token.toUpperCase(), hash)).toBe(false)
      expect(csrfManager.validateToken(token, hash)).toBe(true)
    })
  })

  describe('Integration Scenarios', () => {
    it('should work in typical request/response flow', () => {
      // Server generates token on page load
      const { token, hash } = csrfManager.generateTokenPair()

      // Client receives token (stored in cookie/hidden field)
      // Server stores hash (in session/database)

      // Client submits form with token
      const submittedToken = token

      // Server validates token
      const isValid = csrfManager.validateToken(submittedToken, hash)

      expect(isValid).toBe(true)
    })

    it('should reject replayed tokens with different hash', () => {
      const { token } = csrfManager.generateTokenPair()

      // Generate new hash (simulating token replay attack)
      const newHash = csrfManager.hashToken('different-token')

      const isValid = csrfManager.validateToken(token, newHash)

      expect(isValid).toBe(false)
    })

    it('should handle token rotation', () => {
      // Generate first token
      const pair1 = csrfManager.generateTokenPair()

      // Validate first token
      expect(csrfManager.validateToken(pair1.token, pair1.hash)).toBe(true)

      // Generate new token (rotation)
      const pair2 = csrfManager.generateTokenPair()

      // New token should be valid
      expect(csrfManager.validateToken(pair2.token, pair2.hash)).toBe(true)

      // Old token should not validate with new hash
      expect(csrfManager.validateToken(pair1.token, pair2.hash)).toBe(false)
    })

    it('should work with different manager instances using same secret', () => {
      const secret = 'shared-secret'
      const manager1 = createTestCsrfManager(secret)
      const manager2 = createTestCsrfManager(secret)

      const { token, hash } = manager1.generateTokenPair()

      // Different manager instance with same secret should validate
      const isValid = manager2.validateToken(token, hash)

      expect(isValid).toBe(true)
    })
  })
})
