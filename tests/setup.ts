import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Reset rate limiters before each test
beforeEach(async () => {
  // Dynamically import to avoid circular dependencies
  const { resetAllRateLimiters } = await import('@/lib/rate-limit');
  resetAllRateLimiters();
});

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DIRECT_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.TUTOR_SKILL_ID = 'test-skill-id';
process.env.TRIGGER_API_KEY = 'test-trigger-key';
process.env.TRIGGER_API_URL = 'https://test.trigger.dev';
process.env.SUPER_ADMIN_EMAIL = 'admin@test.com';
process.env.SUPER_ADMIN_PASSWORD_HASH = '$2a$10$test.hash';

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: () => ({
    get: vi.fn(),
  }),
}));

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    verificationToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    quota: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userPreference: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (callback) => {
      // If it's a callback-based transaction, execute it with mocked tx
      if (typeof callback === 'function') {
        const tx = {
          user: {
            create: vi.fn().mockImplementation((args: any) => {
              // Return the mocked user from prisma.user.create
              const { prisma: prismaMock } = require('@/lib/prisma');
              const mockedCreate = vi.mocked(prismaMock.user.create) as any;
              if (mockedCreate.getMockImplementation()) {
                return mockedCreate(args);
              }
              return Promise.resolve(args.data);
            }),
            update: vi.fn(),
          },
          verificationToken: {
            create: vi.fn().mockResolvedValue({
              id: 'token-123',
              userId: 'user-123',
              token: 'verification-token',
              type: 'EMAIL_VERIFICATION',
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdAt: new Date(),
            }),
            delete: vi.fn(),
            deleteMany: vi.fn(),
          },
          quota: {
            create: vi.fn().mockResolvedValue({
              id: 'quota-123',
              userId: 'user-123',
              aiInteractions: 500,
              resetAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
          userPreference: {
            create: vi.fn().mockResolvedValue({
              id: 'pref-123',
              userId: 'user-123',
              uiLocale: 'en',
              explainLocale: 'en',
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
        };
        return await callback(tx);
      }
      // If it's an array of promises, execute them
      return Promise.all(callback);
    }),
  },
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  }),
}));
