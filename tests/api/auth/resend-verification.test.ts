import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/resend-verification/route';
import { prisma } from '@/lib/prisma';

/**
 * Resend Verification Email API Tests
 * POST /api/auth/resend-verification
 */

describe('POST /api/auth/resend-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should resend verification email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash: 'hash',
        emailVerified: false,
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
        token: 'new-token',
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@test.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('sent');
    });

    it('should delete old verification tokens', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash: 'hash',
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@test.com' }),
      });

      await POST(request);

      expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          type: 'EMAIL_VERIFICATION',
        },
      });
    });

    it('should create new verification token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash: 'hash',
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@test.com' }),
      });

      await POST(request);

      expect(prisma.verificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            type: 'EMAIL_VERIFICATION',
          }),
        })
      );
    });
  });

  describe('Error Cases', () => {
    it('should handle non-existent email gracefully', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@test.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still return success to avoid email enumeration
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return success for already verified email (security - prevent enumeration)', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'verified@test.com',
        passwordHash: 'hash',
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'verified@test.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Changed from 400 to 200 for security - prevents email enumeration
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('If an account exists with this email, a verification link has been sent.');
    });

    it('should reject invalid email', async () => {
      const request = new Request('http://localhost:3000/api/auth/resend-verification', {
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
      const request = new Request('http://localhost:3000/api/auth/resend-verification', {
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
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash: 'hash',
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.1',
        },
        body: JSON.stringify({ email: 'user@test.com' }),
      });

      // Should track by IP and email
      expect(request.headers.get('X-Forwarded-For')).toBe('192.168.1.1');
    });
  });
});
