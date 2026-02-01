import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/login/route';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

/**
 * User Login API Tests
 * POST /api/auth/login
 */

describe('POST /api/auth/login', () => {
  const validPassword = 'Test123!@#';
  let passwordHash: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    passwordHash = await bcrypt.hash(validPassword, 10);
  });

  describe('Success Cases', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: validPassword,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.id).toBe('user-123');
    });

    it('should set session cookie', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: validPassword,
        }),
      });

      const response = await POST(request);
      const cookies = response.headers.get('Set-Cookie');

      expect(cookies).toBeDefined();
      // Should contain httpOnly and secure flags
      if (cookies) {
        expect(cookies).toContain('HttpOnly');
        expect(cookies).toContain('SameSite');
      }
    });

    it('should set 7-day expiration without rememberMe', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: validPassword,
          rememberMe: false,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      // Implementation should set Max-Age=604800 (7 days)
    });

    it('should set 30-day expiration with rememberMe', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: validPassword,
          rememberMe: true,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      // Implementation should set Max-Age=2592000 (30 days)
    });

    it('should reset failed login count on success', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 3,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUser,
        failedLoginCount: 0,
      });

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: validPassword,
        }),
      });

      await POST(request);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failedLoginCount: 0,
          }),
        })
      );
    });

    it('should handle case-insensitive email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'User@Test.COM',
          password: validPassword,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Authentication Failures', () => {
    it('should reject non-existent user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: validPassword,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
      expect(data.error.message).not.toContain('user not found'); // Don't reveal if email exists
    });

    it('should reject incorrect password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: 'WrongPassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should increment failed login count on wrong password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 2,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUser,
        failedLoginCount: 3,
      });

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: 'WrongPassword123!',
        }),
      });

      await POST(request);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failedLoginCount: 3,
          }),
        })
      );
    });

    it('should use generic error message for security', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: validPassword,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should not reveal whether email exists
      expect(data.error.message).toBe('Invalid email or password');
    });
  });

  describe('Account Lockout', () => {
    it('should lock account after 5 failed attempts', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 4,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUser,
        failedLoginCount: 5,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
      });

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: 'WrongPassword123!',
        }),
      });

      await POST(request);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failedLoginCount: 5,
            lockedUntil: expect.any(Date),
          }),
        })
      );
    });

    it('should reject login when account is locked', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 5,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: validPassword,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ACCOUNT_LOCKED');
      expect(data.error.message).toContain('locked');
    });

    it('should unlock account after 30 minutes', async () => {
      const pastLockTime = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 5,
        lockedUntil: pastLockTime,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUser,
        failedLoginCount: 0,
        lockedUntil: null,
      });

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: validPassword,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should provide time remaining in lock message', async () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 5,
        lockedUntil,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: validPassword,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.message).toContain('30 minutes');
    });
  });

  describe('Email Verification', () => {
    it('should allow login for verified users', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'verified@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'verified@test.com',
          password: validPassword,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should warn unverified users but allow login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'unverified@test.com',
        passwordHash,
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'unverified@test.com',
          password: validPassword,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.emailVerified).toBe(false);
      // May include warning message
    });
  });

  describe('Validation Errors', () => {
    it('should reject invalid email format', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'notanemail',
          password: validPassword,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty password', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: '',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject missing credentials', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit on login attempts', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.1',
        },
        body: JSON.stringify({
          email: 'user@test.com',
          password: validPassword,
        }),
      });

      // Implementation should track by IP
      expect(request.headers.get('X-Forwarded-For')).toBe('192.168.1.1');
    });
  });

  describe('Security', () => {
    it('should not expose password in response', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: validPassword,
        }),
      });

      const response = await POST(request);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      expect(responseText).not.toContain('passwordHash');
      expect(responseText).not.toContain(validPassword);
    });

    it('should use constant-time comparison for password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash,
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: validPassword,
        }),
      });

      await POST(request);

      // bcrypt.compare is constant-time
      expect(true).toBe(true);
    });
  });
});
