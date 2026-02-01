import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/confirm-reset/route';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

/**
 * Password Reset Confirmation API Tests
 * POST /api/auth/confirm-reset
 */

describe('POST /api/auth/confirm-reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should reset password with valid token', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'valid-reset-token',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      };

      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        passwordHash: 'old-hash',
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockToken);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUser,
        passwordHash: 'new-hash',
        failedLoginCount: 0,
        lockedUntil: null,
      });
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue(mockToken);

      const request = new Request('http://localhost:3000/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-reset-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('reset');
    });

    it('should hash new password', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'valid-token',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockToken);

      let capturedHash = '';
      vi.mocked(prisma.user.update).mockImplementation(async (args: any) => {
        capturedHash = args.data.passwordHash;
        return {
          id: 'user-123',
          email: 'user@test.com',
          passwordHash: capturedHash,
          emailVerified: true,
          failedLoginCount: 0,
          lockedUntil: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const request = new Request('http://localhost:3000/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        }),
      });

      await POST(request);

      expect(capturedHash).toBeDefined();
      expect(capturedHash).not.toBe('NewPassword123!');
      expect(capturedHash.startsWith('$2a$') || capturedHash.startsWith('$2b$')).toBe(true);
    });

    it('should reset failed login count and unlock account', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'valid-token',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockToken);
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        passwordHash: 'new-hash',
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        }),
      });

      await POST(request);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failedLoginCount: 0,
            lockedUntil: null,
          }),
        })
      );
    });

    it('should delete reset token after use', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'valid-token',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockToken);

      const request = new Request('http://localhost:3000/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        }),
      });

      await POST(request);

      expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
      });
    });
  });

  describe('Validation Errors', () => {
    it('should reject passwords that do not match', async () => {
      const request = new Request('http://localhost:3000/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
          password: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('do not match');
    });

    it('should reject weak password', async () => {
      const request = new Request('http://localhost:3000/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
          password: 'weak',
          confirmPassword: 'weak',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'invalid-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        }),
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
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() - 1000), // Expired
        createdAt: new Date(),
      };

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockToken);

      const request = new Request('http://localhost:3000/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'expired-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        }),
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
        token: 'verification-token',
        type: 'EMAIL_VERIFICATION' as const,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockToken);

      const request = new Request('http://localhost:3000/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'verification-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject missing fields', async () => {
      const request = new Request('http://localhost:3000/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Security', () => {
    it('should not expose password in response', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'valid-token',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockToken);

      const request = new Request('http://localhost:3000/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      expect(responseText).not.toContain('NewPassword123!');
      expect(responseText).not.toContain('passwordHash');
    });
  });
});
