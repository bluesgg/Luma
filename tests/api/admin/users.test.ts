// =============================================================================
// Admin User List API Tests (TDD - Phase 7)
// GET /api/admin/users
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

async function getUserList(
  sessionCookie?: string,
  params?: { page?: number; pageSize?: number; search?: string; sort?: string }
) {
  const headers: any = {}
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie
  }

  const queryParams = new URLSearchParams(params as any)
  const url = `/api/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

  const response = await fetch(url, { method: 'GET', headers })
  return { status: response.status, data: await response.json() }
}

describe('GET /api/admin/users', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany()
    await prisma.quota.deleteMany()
    await prisma.admin.deleteMany()

    await prisma.admin.create({
      data: {
        email: 'admin@luma.com',
        passwordHash: '$2b$10$hashedpassword',
        role: 'ADMIN',
      },
    })
  })

  afterEach(async () => {
    await prisma.user.deleteMany()
    await prisma.quota.deleteMany()
    await prisma.admin.deleteMany()
  })

  describe('Authentication', () => {
    it('should require admin authentication', async () => {
      const response = await getUserList()
      expect(response.status).toBe(401)
    })

    it('should allow admin access', async () => {
      const response = await getUserList('luma-admin-session=valid-token')
      expect(response.status).toBe(200)
    })
  })

  describe('Happy Path', () => {
    it('should return list of users', async () => {
      await prisma.user.createMany({
        data: [
          {
            email: 'user1@example.com',
            passwordHash: 'hash',
            emailConfirmedAt: new Date(),
          },
          {
            email: 'user2@example.com',
            passwordHash: 'hash',
            emailConfirmedAt: new Date(),
          },
        ],
      })

      const response = await getUserList('luma-admin-session=valid-token')

      expect(response.data.data.items).toBeInstanceOf(Array)
      expect(response.data.data.items.length).toBe(2)
    })

    it('should include user details in response', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash: 'hash',
          role: 'STUDENT',
          emailConfirmedAt: new Date(),
          lastLoginAt: new Date(),
        },
      })

      const response = await getUserList('luma-admin-session=valid-token')

      const userData = response.data.data.items[0]
      expect(userData.id).toBe(user.id)
      expect(userData.email).toBe('user@example.com')
      expect(userData.role).toBe('STUDENT')
      expect(userData.emailConfirmedAt).toBeDefined()
      expect(userData.lastLoginAt).toBeDefined()
    })

    it('should include quota summary for each user', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash: 'hash',
          emailConfirmedAt: new Date(),
        },
      })

      await prisma.quota.createMany({
        data: [
          {
            userId: user.id,
            bucket: 'LEARNING_INTERACTIONS',
            used: 50,
            limit: 150,
            resetAt: new Date(),
          },
          {
            userId: user.id,
            bucket: 'AUTO_EXPLAIN',
            used: 100,
            limit: 300,
            resetAt: new Date(),
          },
        ],
      })

      const response = await getUserList('luma-admin-session=valid-token')

      const userData = response.data.data.items[0]
      expect(userData.quotaSummary).toBeDefined()
      expect(userData.quotaSummary.learningInteractions).toEqual({
        used: 50,
        limit: 150,
      })
      expect(userData.quotaSummary.autoExplain).toEqual({ used: 100, limit: 300 })
    })

    it('should include course count for each user', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash: 'hash',
          emailConfirmedAt: new Date(),
        },
      })

      await prisma.course.createMany({
        data: [
          { userId: user.id, name: 'Course 1' },
          { userId: user.id, name: 'Course 2' },
        ],
      })

      const response = await getUserList('luma-admin-session=valid-token')

      const userData = response.data.data.items[0]
      expect(userData._count.courses).toBe(2)
    })
  })

  describe('Pagination', () => {
    it('should support pagination', async () => {
      await prisma.user.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({
          email: `user${i}@example.com`,
          passwordHash: 'hash',
        })),
      })

      const response = await getUserList('luma-admin-session=valid-token', {
        page: 1,
        pageSize: 10,
      })

      expect(response.data.data.items.length).toBe(10)
      expect(response.data.data.total).toBe(30)
      expect(response.data.data.page).toBe(1)
      expect(response.data.data.totalPages).toBe(3)
    })

    it('should return second page correctly', async () => {
      await prisma.user.createMany({
        data: Array.from({ length: 25 }, (_, i) => ({
          email: `user${i}@example.com`,
          passwordHash: 'hash',
        })),
      })

      const response = await getUserList('luma-admin-session=valid-token', {
        page: 2,
        pageSize: 10,
      })

      expect(response.data.data.page).toBe(2)
      expect(response.data.data.items.length).toBe(10)
    })

    it('should use default page size of 20', async () => {
      await prisma.user.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({
          email: `user${i}@example.com`,
          passwordHash: 'hash',
        })),
      })

      const response = await getUserList('luma-admin-session=valid-token')

      expect(response.data.data.items.length).toBe(20)
    })
  })

  describe('Search', () => {
    it('should search users by email', async () => {
      await prisma.user.createMany({
        data: [
          { email: 'john@example.com', passwordHash: 'hash' },
          { email: 'jane@example.com', passwordHash: 'hash' },
          { email: 'bob@test.com', passwordHash: 'hash' },
        ],
      })

      const response = await getUserList('luma-admin-session=valid-token', {
        search: 'example',
      })

      expect(response.data.data.items.length).toBe(2)
      expect(response.data.data.items.every((u: any) =>
        u.email.includes('example')
      )).toBe(true)
    })

    it('should be case-insensitive', async () => {
      await prisma.user.create({
        data: { email: 'Test@Example.com', passwordHash: 'hash' },
      })

      const response = await getUserList('luma-admin-session=valid-token', {
        search: 'test',
      })

      expect(response.data.data.items.length).toBe(1)
    })
  })

  describe('Sorting', () => {
    it('should sort by creation date (newest first by default)', async () => {
      const user1 = await prisma.user.create({
        data: { email: 'old@example.com', passwordHash: 'hash' },
      })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const user2 = await prisma.user.create({
        data: { email: 'new@example.com', passwordHash: 'hash' },
      })

      const response = await getUserList('luma-admin-session=valid-token')

      expect(response.data.data.items[0].id).toBe(user2.id)
      expect(response.data.data.items[1].id).toBe(user1.id)
    })
  })

  describe('Security', () => {
    it('should not return password hashes', async () => {
      await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash: 'hash',
          emailConfirmedAt: new Date(),
        },
      })

      const response = await getUserList('luma-admin-session=valid-token')

      const userData = response.data.data.items[0]
      expect(userData.passwordHash).toBeUndefined()
      expect(userData.password).toBeUndefined()
    })

    it('should not return sensitive fields', async () => {
      await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash: 'hash',
          failedLoginAttempts: 2,
          lockedUntil: new Date(),
        },
      })

      const response = await getUserList('luma-admin-session=valid-token')

      const userData = response.data.data.items[0]
      expect(userData.failedLoginAttempts).toBeUndefined()
      expect(userData.lockedUntil).toBeUndefined()
    })
  })

  describe('Response Format', () => {
    it('should have correct pagination structure', async () => {
      const response = await getUserList('luma-admin-session=valid-token')

      expect(response.data.data).toHaveProperty('items')
      expect(response.data.data).toHaveProperty('total')
      expect(response.data.data).toHaveProperty('page')
      expect(response.data.data).toHaveProperty('pageSize')
      expect(response.data.data).toHaveProperty('totalPages')
    })
  })
})
