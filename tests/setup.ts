// =============================================================================
// Test Setup File
// =============================================================================

import { vi, beforeEach } from 'vitest'

// Mock environment variables
;(process.env as any).NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.DIRECT_URL = 'postgresql://test:test@localhost:5432/test'

// Mock Next.js modules
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}))

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    course: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    file: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    learningSession: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    quota: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subTopicProgress: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    topicProgress: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    topicTest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    extractedImage: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
  default: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signIn: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        createSignedUrl: vi.fn(),
      })),
    },
  })),
}))

// Mock OpenRouter AI client
vi.mock('@/lib/ai', () => ({
  generateExplanation: vi.fn(),
  generateTestQuestions: vi.fn(),
  extractKnowledgeStructure: vi.fn(),
}))

// Mock Mathpix client
vi.mock('@/lib/ai/mathpix', () => ({
  recognizeFormula: vi.fn(),
}))

// Mock API client
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}))

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// Global test utilities
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'STUDENT' as const,
  emailConfirmedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  passwordHash: 'hashed-password',
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastLoginAt: new Date(),
}

export const mockCourse = {
  id: 'course-1',
  userId: 'user-1',
  name: 'Test Course',
  school: 'Test University',
  term: 'Fall 2024',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockFile = {
  id: 'file-1',
  courseId: 'course-1',
  name: 'test.pdf',
  type: 'LECTURE' as const,
  pageCount: 10,
  fileSize: BigInt(1000000),
  isScanned: false,
  status: 'READY' as const,
  storagePath: 'files/test.pdf',
  structureStatus: 'READY' as const,
  structureError: null,
  extractedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockLearningSession = {
  id: 'session-1',
  userId: 'user-1',
  fileId: 'file-1',
  status: 'IN_PROGRESS' as const,
  currentTopicIndex: 0,
  currentSubIndex: 0,
  currentPhase: 'EXPLAINING' as const,
  startedAt: new Date(),
  lastActiveAt: new Date(),
  completedAt: null,
}

export const mockQuota = {
  id: 'quota-1',
  userId: 'user-1',
  bucket: 'LEARNING_INTERACTIONS' as const,
  used: 10,
  limit: 150,
  resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
}
