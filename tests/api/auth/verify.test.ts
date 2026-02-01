import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/verify/route';
import { prisma } from '@/lib/prisma';

/**
 * Email Verification API Tests
 * POST /api/auth/verify
 */

describe('POST /api/auth/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should verify email with valid token', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'valid-token',
        type: 'EMAIL_VERIFICATION' as const,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

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

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockToken);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue(mockToken);

      const request = new Request('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('verified');
    });

    it('should set emailVerified to true', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'valid-token',
        type: 'EMAIL_VERIFICATION' as const,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockToken);
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        passwordHash: 'hash',
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token' }),
      });

      await POST(request);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { emailVerified: true },
        })
      );
    });

    it('should delete verification token after use', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'valid-token',
        type: 'EMAIL_VERIFICATION' as const,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockToken);
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue(mockToken);

      const request = new Request('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token' }),
      });

      await POST(request);

      expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
      });
    });
  });

  describe('Error Cases', () => {
    it('should reject invalid token', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired token', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'expired-token',
        type: 'EMAIL_VERIFICATION' as const,
        expiresAt: new Date(Date.now() - 1000), // Expired
        createdAt: new Date(),
      };

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockToken);

      const request = new Request('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'expired-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject wrong token type', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'password-reset-token',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockToken);

      const request = new Request('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'password-reset-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject empty token', async () => {
      const request = new Request('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject missing token', async () => {
      const request = new Request('http://localhost:3000/api/auth/verify', {
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

  describe('Edge Cases', () => {
    it('should handle already verified email', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'valid-token',
        type: 'EMAIL_VERIFICATION' as const,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash: 'hash',
        emailVerified: true, // Already verified
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockToken);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockRejectedValue(
        new Error('Database error')
      );

      const request = new Request('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
