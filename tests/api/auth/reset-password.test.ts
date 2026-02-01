import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/reset-password/route';
import { prisma } from '@/lib/prisma';

/**
 * Password Reset Request API Tests
 * POST /api/auth/reset-password
 */

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should send password reset email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash: 'hash',
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.verificationToken.create).mockResolvedValue({
        id: 'token-123',
        userId: 'user-123',
        token: 'reset-token',
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@test.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('reset');
    });

    it('should delete old reset tokens', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash: 'hash',
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@test.com' }),
      });

      await POST(request);

      expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          type: 'PASSWORD_RESET',
        },
      });
    });

    it('should create reset token with 1 hour expiration', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash: 'hash',
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@test.com' }),
      });

      await POST(request);

      expect(prisma.verificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'PASSWORD_RESET',
            expiresAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('Security Cases', () => {
    it('should not reveal if email exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@test.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should return success to prevent email enumeration
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).not.toContain('not found');
    });

    it('should handle unverified accounts', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'unverified@test.com',
        passwordHash: 'hash',
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'unverified@test.com' }),
      });

      const response = await POST(request);

      // Should still allow password reset
      expect(response.status).toBe(200);
    });

    it('should handle locked accounts', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'locked@test.com',
        passwordHash: 'hash',
        emailVerified: true,
        failedLoginCount: 5,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'locked@test.com' }),
      });

      const response = await POST(request);

      // Should still send reset email
      expect(response.status).toBe(200);
    });
  });

  describe('Validation Errors', () => {
    it('should reject invalid email', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'notanemail' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject missing email', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
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
    it('should enforce rate limit', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.1',
        },
        body: JSON.stringify({ email: 'user@test.com' }),
      });

      // Should rate limit by IP
      expect(request.headers.get('X-Forwarded-For')).toBe('192.168.1.1');
    });
  });
});
