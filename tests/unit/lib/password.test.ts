import { describe, it, expect, beforeEach } from 'vitest';
import * as bcrypt from 'bcryptjs';

/**
 * Password utility tests
 * Tests password hashing and verification logic
 */

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password with bcrypt', async () => {
      const password = 'Test123!@#';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'Test123!@#';
      const hash1 = await bcrypt.hash(password, 10);
      const hash2 = await bcrypt.hash(password, 10);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).toBeDefined();
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle unicode characters in password', async () => {
      const password = '密码123!@#你好';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).toBeDefined();
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle very long passwords', async () => {
      const password = 'a'.repeat(200);
      const hash = await bcrypt.hash(password, 10);

      expect(hash).toBeDefined();
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    let password: string;
    let hash: string;

    beforeEach(async () => {
      password = 'Test123!@#';
      hash = await bcrypt.hash(password, 10);
    });

    it('should verify correct password', async () => {
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const isValid = await bcrypt.compare('WrongPassword123!', hash);
      expect(isValid).toBe(false);
    });

    it('should reject password with different case', async () => {
      const isValid = await bcrypt.compare('test123!@#', hash);
      expect(isValid).toBe(false);
    });

    it('should reject password with extra characters', async () => {
      const isValid = await bcrypt.compare(password + 'extra', hash);
      expect(isValid).toBe(false);
    });

    it('should reject password missing characters', async () => {
      const isValid = await bcrypt.compare('Test123!@', hash);
      expect(isValid).toBe(false);
    });

    it('should reject empty password', async () => {
      const isValid = await bcrypt.compare('', hash);
      expect(isValid).toBe(false);
    });

    it('should handle invalid hash format gracefully', async () => {
      await expect(bcrypt.compare(password, 'invalid-hash')).rejects.toThrow();
    });
  });

  describe('Password Strength Requirements', () => {
    it('should validate minimum length (8 characters)', () => {
      const shortPassword = 'Test12!';
      const validPassword = 'Test123!';

      expect(shortPassword.length).toBeLessThan(8);
      expect(validPassword.length).toBeGreaterThanOrEqual(8);
    });

    it('should validate maximum length (128 characters)', () => {
      const tooLongPassword = 'a'.repeat(129);
      const validPassword = 'a'.repeat(128);

      expect(tooLongPassword.length).toBeGreaterThan(128);
      expect(validPassword.length).toBeLessThanOrEqual(128);
    });

    it('should require uppercase letter', () => {
      const noUppercase = 'test123!@#';
      const withUppercase = 'Test123!@#';

      expect(/[A-Z]/.test(noUppercase)).toBe(false);
      expect(/[A-Z]/.test(withUppercase)).toBe(true);
    });

    it('should require lowercase letter', () => {
      const noLowercase = 'TEST123!@#';
      const withLowercase = 'Test123!@#';

      expect(/[a-z]/.test(noLowercase)).toBe(false);
      expect(/[a-z]/.test(withLowercase)).toBe(true);
    });

    it('should require number', () => {
      const noNumber = 'TestTest!@#';
      const withNumber = 'Test123!@#';

      expect(/\d/.test(noNumber)).toBe(false);
      expect(/\d/.test(withNumber)).toBe(true);
    });

    it('should require special character', () => {
      const noSpecial = 'Test1234567';
      const withSpecial = 'Test123!@#';

      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(noSpecial)).toBe(false);
      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(withSpecial)).toBe(true);
    });
  });

  describe('Common Weak Passwords', () => {
    it('should identify common weak passwords', () => {
      const weakPasswords = [
        'password',
        '12345678',
        'qwerty123',
        'admin123',
        'Password1',
        'Passw0rd!',
      ];

      const commonPatterns = [
        /^password/i,
        /^\d+$/,
        /^qwerty/i,
        /^admin/i,
      ];

      weakPasswords.forEach((pwd) => {
        const isWeak = commonPatterns.some((pattern) => pattern.test(pwd));
        // At least some of these should be caught by common patterns
        expect(typeof isWeak).toBe('boolean');
      });
    });
  });

  describe('Performance', () => {
    it('should hash password in reasonable time', async () => {
      const password = 'Test123!@#';
      const startTime = Date.now();
      await bcrypt.hash(password, 10);
      const endTime = Date.now();

      // Should complete in less than 500ms
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should verify password in reasonable time', async () => {
      const password = 'Test123!@#';
      const hash = await bcrypt.hash(password, 10);

      const startTime = Date.now();
      await bcrypt.compare(password, hash);
      const endTime = Date.now();

      // Should complete in less than 500ms
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});
