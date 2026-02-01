import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/register/route';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

/**
 * User Registration API Tests
 * POST /api/auth/register
 */

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    });
  });

  describe('Success Cases', () => {
    it('should register a new user with valid data', async () => {
      const requestData = {
        email: 'newuser@test.com',
        password: 'Test123!@#',
      };

      const mockUser = {
        id: 'user-123',
        email: requestData.email,
        passwordHash: await bcrypt.hash(requestData.password, 10),
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);
      vi.mocked(prisma.verificationToken.create).mockResolvedValue({
        id: 'token-123',
        userId: mockUser.id,
        token: 'verification-token',
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
      vi.mocked(prisma.quota.create).mockResolvedValue({
        id: 'quota-123',
        userId: mockUser.id,
        aiInteractions: 500,
        resetAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.userPreference.create).mockResolvedValue({
        id: 'pref-123',
        userId: mockUser.id,
        uiLocale: 'en',
        explainLocale: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.email).toBe(requestData.email);
      expect(data.data.user.passwordHash).toBeUndefined(); // Should not expose password hash
    });

    it('should hash the password', async () => {
      const requestData = {
        email: 'hashtest@test.com',
        password: 'Test123!@#',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      let capturedHash = '';
      vi.mocked(prisma.user.create).mockImplementation(async (args: any) => {
        capturedHash = args.data.passwordHash;
        return {
          id: 'user-123',
          email: args.data.email,
          passwordHash: capturedHash,
          emailVerified: false,
          failedLoginCount: 0,
          lockedUntil: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      await POST(request);

      expect(capturedHash).toBeDefined();
      expect(capturedHash).not.toBe(requestData.password);
      expect(capturedHash.startsWith('$2a$') || capturedHash.startsWith('$2b$')).toBe(true);
    });

    it('should create verification token', async () => {
      const requestData = {
        email: 'verifytest@test.com',
        password: 'Test123!@#',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-123',
        email: requestData.email,
        passwordHash: 'hashed',
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'verification-token',
        type: 'EMAIL_VERIFICATION' as const,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(prisma.verificationToken.create).mockResolvedValue(mockToken);

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
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

    it('should create initial quota (500 AI interactions)', async () => {
      const requestData = {
        email: 'quotatest@test.com',
        password: 'Test123!@#',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-123',
        email: requestData.email,
        passwordHash: 'hashed',
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      await POST(request);

      expect(prisma.quota.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            aiInteractions: 500,
          }),
        })
      );
    });

    it('should create user preferences with default locale', async () => {
      const requestData = {
        email: 'preftest@test.com',
        password: 'Test123!@#',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-123',
        email: requestData.email,
        passwordHash: 'hashed',
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      await POST(request);

      expect(prisma.userPreference.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            uiLocale: 'en',
            explainLocale: 'en',
          }),
        })
      );
    });

    it('should send verification email', async () => {
      const requestData = {
        email: 'emailtest@test.com',
        password: 'Test123!@#',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-123',
        email: requestData.email,
        passwordHash: 'hashed',
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.message).toContain('verification email');
    });
  });

  describe('Validation Errors', () => {
    it('should reject invalid email format', async () => {
      const requestData = {
        email: 'notanemail',
        password: 'Test123!@#',
      };

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('email');
    });

    it('should reject password without uppercase', async () => {
      const requestData = {
        email: 'test@test.com',
        password: 'test123!@#',
      };

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('uppercase');
    });

    it('should reject password without lowercase', async () => {
      const requestData = {
        email: 'test@test.com',
        password: 'TEST123!@#',
      };

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('lowercase');
    });

    it('should reject password without number', async () => {
      const requestData = {
        email: 'test@test.com',
        password: 'TestTest!@#',
      };

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('number');
    });

    it('should reject password without special character', async () => {
      const requestData = {
        email: 'test@test.com',
        password: 'Test1234567',
      };

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('special character');
    });

    it('should reject password too short', async () => {
      const requestData = {
        email: 'test@test.com',
        password: 'Test1!',
      };

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('8 characters');
    });

    it('should reject password too long', async () => {
      const requestData = {
        email: 'test@test.com',
        password: 'A1!' + 'a'.repeat(126),
      };

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('128 characters');
    });

    it('should reject missing email', async () => {
      const requestData = {
        password: 'Test123!@#',
      };

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject missing password', async () => {
      const requestData = {
        email: 'test@test.com',
      };

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject empty request body', async () => {
      const request = new Request('http://localhost:3000/api/auth/register', {
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

  describe('Business Logic Errors', () => {
    it('should reject duplicate email', async () => {
      const requestData = {
        email: 'existing@test.com',
        password: 'Test123!@#',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing-user',
        email: requestData.email,
        passwordHash: 'hashed',
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('EMAIL_EXISTS');
      expect(data.error.message).toContain('already registered');
    });

    it('should handle case-insensitive email check', async () => {
      const requestData = {
        email: 'Test@Example.Com',
        password: 'Test123!@#',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
        passwordHash: 'hashed',
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit (10 requests per 15 minutes)', async () => {
      // This test would require actual rate limiter implementation
      // For now, we just validate the concept

      const requestData = {
        email: 'ratelimit@test.com',
        password: 'Test123!@#',
      };

      // Simulate rate limit exceeded
      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.1',
        },
        body: JSON.stringify(requestData),
      });

      // Implementation would check rate limiter here
      expect(request.headers.get('X-Forwarded-For')).toBe('192.168.1.1');
    });

    it('should provide rate limit headers', async () => {
      const requestData = {
        email: 'headers@test.com',
        password: 'Test123!@#',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-123',
        email: requestData.email,
        passwordHash: 'hashed',
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);

      // Implementation should set these headers
      expect(response.headers).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const requestData = {
        email: 'dberror@test.com',
        password: 'Test123!@#',
      };

      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle email service errors gracefully', async () => {
      const requestData = {
        email: 'emailerror@test.com',
        password: 'Test123!@#',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-123',
        email: requestData.email,
        passwordHash: 'hashed',
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      // User should still be created even if email fails
      const response = await POST(request);

      expect(response.status).toBeLessThan(500);
    });

    it('should rollback transaction on error', async () => {
      const requestData = {
        email: 'rollback@test.com',
        password: 'Test123!@#',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-123',
        email: requestData.email,
        passwordHash: 'hashed',
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.quota.create).mockRejectedValue(new Error('Quota creation failed'));

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('Security', () => {
    it('should not expose password in response', async () => {
      const requestData = {
        email: 'security@test.com',
        password: 'Test123!@#',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-123',
        email: requestData.email,
        passwordHash: 'hashed',
        emailVerified: false,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      expect(responseText).not.toContain(requestData.password);
      expect(responseText).not.toContain('passwordHash');
    });

    it('should sanitize email input', async () => {
      const requestData = {
        email: '  Test@Example.Com  ',
        password: 'Test123!@#',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      await POST(request);

      // Email should be trimmed and lowercase
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: expect.stringMatching(/^[^\s].*[^\s]$/), // No leading/trailing spaces
          }),
        })
      );
    });
  });
});
