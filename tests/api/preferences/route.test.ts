// =============================================================================
// Phase 6: User Settings - User Preferences API Tests (TDD)
// GET /api/preferences - Fetch user preferences
// PATCH /api/preferences - Update user preferences
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/lib/constants'

// Test user data
const TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  passwordHash: '$2b$10$hashedpassword',
  role: 'STUDENT' as const,
  emailConfirmedAt: new Date(),
}

// Helper functions
async function getPreferences(userId: string) {
  const response = await fetch('/api/preferences', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Session cookie would be set in real environment
    },
  })
  return {
    status: response.status,
    data: await response.json(),
  }
}

async function updatePreferences(userId: string, data: { uiLocale?: string; explainLocale?: string }) {
  const response = await fetch('/api/preferences', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  return {
    status: response.status,
    data: await response.json(),
  }
}

describe('GET /api/preferences (Phase 6 - SETTINGS-001)', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.userPreference.deleteMany()
    await prisma.user.deleteMany()

    // Create test user
    await prisma.user.create({
      data: TEST_USER,
    })
  })

  afterEach(async () => {
    await prisma.userPreference.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Default Preferences Creation', () => {
    it('should create default preferences if none exist', async () => {
      const response = await getPreferences(TEST_USER.id)

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data).toBeDefined()
      expect(response.data.data.uiLocale).toBe('en')
      expect(response.data.data.explainLocale).toBe('en')
    })

    it('should persist created preferences in database', async () => {
      await getPreferences(TEST_USER.id)

      const preference = await prisma.userPreference.findUnique({
        where: { userId: TEST_USER.id },
      })

      expect(preference).toBeDefined()
      expect(preference?.uiLocale).toBe('en')
      expect(preference?.explainLocale).toBe('en')
    })

    it('should include all required fields in response', async () => {
      const response = await getPreferences(TEST_USER.id)

      expect(response.data.data).toHaveProperty('id')
      expect(response.data.data).toHaveProperty('userId')
      expect(response.data.data).toHaveProperty('uiLocale')
      expect(response.data.data).toHaveProperty('explainLocale')
      expect(response.data.data).toHaveProperty('updatedAt')
    })
  })

  describe('Existing Preferences Retrieval', () => {
    it('should return existing preferences', async () => {
      // Create preferences manually
      await prisma.userPreference.create({
        data: {
          userId: TEST_USER.id,
          uiLocale: 'zh',
          explainLocale: 'en',
        },
      })

      const response = await getPreferences(TEST_USER.id)

      expect(response.status).toBe(200)
      expect(response.data.data.uiLocale).toBe('zh')
      expect(response.data.data.explainLocale).toBe('en')
    })

    it('should not create duplicate preferences', async () => {
      // Call twice
      await getPreferences(TEST_USER.id)
      await getPreferences(TEST_USER.id)

      const count = await prisma.userPreference.count({
        where: { userId: TEST_USER.id },
      })

      expect(count).toBe(1)
    })

    it('should return updated values after modification', async () => {
      await getPreferences(TEST_USER.id)

      // Update preferences
      await prisma.userPreference.update({
        where: { userId: TEST_USER.id },
        data: { uiLocale: 'zh' },
      })

      const response = await getPreferences(TEST_USER.id)
      expect(response.data.data.uiLocale).toBe('zh')
    })
  })

  describe('Authentication', () => {
    it('should require authentication', async () => {
      // Mock unauthenticated request
      const response = await fetch('/api/preferences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(response.status).toBe(401)
    })

    it('should return unauthorized error message', async () => {
      const response = await fetch('/api/preferences', {
        method: 'GET',
      })

      const data = await response.json()
      expect(data.error.code).toBe(ERROR_CODES.AUTH_UNAUTHORIZED)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      vi.spyOn(prisma.userPreference, 'findUnique').mockRejectedValueOnce(
        new Error('Database error')
      )

      const response = await getPreferences(TEST_USER.id)

      expect(response.status).toBe(500)
      expect(response.data.error.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR)
    })

    it('should handle creation errors', async () => {
      vi.spyOn(prisma.userPreference, 'create').mockRejectedValueOnce(
        new Error('Creation failed')
      )

      const response = await getPreferences(TEST_USER.id)

      expect(response.status).toBe(500)
    })
  })

  describe('Response Format', () => {
    it('should return data in standard API format', async () => {
      const response = await getPreferences(TEST_USER.id)

      expect(response.data).toHaveProperty('success')
      expect(response.data).toHaveProperty('data')
      expect(response.data.success).toBe(true)
    })

    it('should serialize dates correctly', async () => {
      const response = await getPreferences(TEST_USER.id)

      expect(typeof response.data.data.updatedAt).toBe('string')
      expect(new Date(response.data.data.updatedAt)).toBeInstanceOf(Date)
    })
  })
})

describe('PATCH /api/preferences (Phase 6 - SETTINGS-002)', () => {
  beforeEach(async () => {
    await prisma.userPreference.deleteMany()
    await prisma.user.deleteMany()

    await prisma.user.create({
      data: TEST_USER,
    })
  })

  afterEach(async () => {
    await prisma.userPreference.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Update UI Locale', () => {
    it('should update UI locale to Chinese', async () => {
      // Create default preferences first
      await getPreferences(TEST_USER.id)

      const response = await updatePreferences(TEST_USER.id, {
        uiLocale: 'zh',
      })

      expect(response.status).toBe(200)
      expect(response.data.data.uiLocale).toBe('zh')
    })

    it('should update UI locale to English', async () => {
      await prisma.userPreference.create({
        data: {
          userId: TEST_USER.id,
          uiLocale: 'zh',
          explainLocale: 'zh',
        },
      })

      const response = await updatePreferences(TEST_USER.id, {
        uiLocale: 'en',
      })

      expect(response.status).toBe(200)
      expect(response.data.data.uiLocale).toBe('en')
    })

    it('should persist UI locale change in database', async () => {
      await getPreferences(TEST_USER.id)

      await updatePreferences(TEST_USER.id, { uiLocale: 'zh' })

      const preference = await prisma.userPreference.findUnique({
        where: { userId: TEST_USER.id },
      })

      expect(preference?.uiLocale).toBe('zh')
    })

    it('should not affect explain locale when updating UI locale', async () => {
      await prisma.userPreference.create({
        data: {
          userId: TEST_USER.id,
          uiLocale: 'en',
          explainLocale: 'zh',
        },
      })

      await updatePreferences(TEST_USER.id, { uiLocale: 'zh' })

      const preference = await prisma.userPreference.findUnique({
        where: { userId: TEST_USER.id },
      })

      expect(preference?.explainLocale).toBe('zh')
    })
  })

  describe('Update Explain Locale', () => {
    it('should update explain locale to Chinese', async () => {
      await getPreferences(TEST_USER.id)

      const response = await updatePreferences(TEST_USER.id, {
        explainLocale: 'zh',
      })

      expect(response.status).toBe(200)
      expect(response.data.data.explainLocale).toBe('zh')
    })

    it('should update explain locale to English', async () => {
      await prisma.userPreference.create({
        data: {
          userId: TEST_USER.id,
          uiLocale: 'en',
          explainLocale: 'zh',
        },
      })

      const response = await updatePreferences(TEST_USER.id, {
        explainLocale: 'en',
      })

      expect(response.status).toBe(200)
      expect(response.data.data.explainLocale).toBe('en')
    })

    it('should not affect UI locale when updating explain locale', async () => {
      await prisma.userPreference.create({
        data: {
          userId: TEST_USER.id,
          uiLocale: 'zh',
          explainLocale: 'en',
        },
      })

      await updatePreferences(TEST_USER.id, { explainLocale: 'zh' })

      const preference = await prisma.userPreference.findUnique({
        where: { userId: TEST_USER.id },
      })

      expect(preference?.uiLocale).toBe('zh')
    })
  })

  describe('Update Both Locales', () => {
    it('should update both locales simultaneously', async () => {
      await getPreferences(TEST_USER.id)

      const response = await updatePreferences(TEST_USER.id, {
        uiLocale: 'zh',
        explainLocale: 'zh',
      })

      expect(response.status).toBe(200)
      expect(response.data.data.uiLocale).toBe('zh')
      expect(response.data.data.explainLocale).toBe('zh')
    })

    it('should set different locales for UI and explain', async () => {
      await getPreferences(TEST_USER.id)

      const response = await updatePreferences(TEST_USER.id, {
        uiLocale: 'en',
        explainLocale: 'zh',
      })

      expect(response.data.data.uiLocale).toBe('en')
      expect(response.data.data.explainLocale).toBe('zh')
    })
  })

  describe('Validation', () => {
    it('should reject invalid UI locale', async () => {
      const response = await updatePreferences(TEST_USER.id, {
        uiLocale: 'fr', // Not supported
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should reject invalid explain locale', async () => {
      const response = await updatePreferences(TEST_USER.id, {
        explainLocale: 'es', // Not supported
      })

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('should only accept "en" or "zh" for UI locale', async () => {
      const invalidLocales = ['de', 'fr', 'ja', 'invalid', '']

      for (const locale of invalidLocales) {
        const response = await updatePreferences(TEST_USER.id, {
          uiLocale: locale,
        })
        expect(response.status).toBe(400)
      }
    })

    it('should only accept "en" or "zh" for explain locale', async () => {
      const invalidLocales = ['de', 'fr', 'ja', 'invalid', '']

      for (const locale of invalidLocales) {
        const response = await updatePreferences(TEST_USER.id, {
          explainLocale: locale,
        })
        expect(response.status).toBe(400)
      }
    })

    it('should reject empty request body', async () => {
      const response = await updatePreferences(TEST_USER.id, {})

      expect(response.status).toBe(400)
    })

    it('should reject unknown fields', async () => {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uiLocale: 'en',
          unknownField: 'value',
        }),
      })

      const data = await response.json()
      expect(response.status).toBe(400)
    })
  })

  describe('Auto-creation', () => {
    it('should create preferences if updating non-existent preferences', async () => {
      const response = await updatePreferences(TEST_USER.id, {
        uiLocale: 'zh',
      })

      expect(response.status).toBe(200)

      const preference = await prisma.userPreference.findUnique({
        where: { userId: TEST_USER.id },
      })

      expect(preference).toBeDefined()
      expect(preference?.uiLocale).toBe('zh')
    })

    it('should use defaults for unspecified fields on auto-creation', async () => {
      const response = await updatePreferences(TEST_USER.id, {
        uiLocale: 'zh',
      })

      expect(response.data.data.explainLocale).toBe('en') // default
    })
  })

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uiLocale: 'zh' }),
      })

      expect(response.status).toBe(401)
    })

    it('should not allow updating other users preferences', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          passwordHash: '$2b$10$hash',
          emailConfirmedAt: new Date(),
        },
      })

      await prisma.userPreference.create({
        data: {
          userId: otherUser.id,
          uiLocale: 'en',
          explainLocale: 'en',
        },
      })

      // Attempt to update as TEST_USER
      const response = await updatePreferences(TEST_USER.id, {
        uiLocale: 'zh',
      })

      // Should update TEST_USER's preferences, not otherUser's
      const otherPreference = await prisma.userPreference.findUnique({
        where: { userId: otherUser.id },
      })

      expect(otherPreference?.uiLocale).toBe('en') // unchanged
    })
  })

  describe('Timestamp Updates', () => {
    it('should update updatedAt timestamp', async () => {
      await getPreferences(TEST_USER.id)

      const before = await prisma.userPreference.findUnique({
        where: { userId: TEST_USER.id },
      })

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      await updatePreferences(TEST_USER.id, { uiLocale: 'zh' })

      const after = await prisma.userPreference.findUnique({
        where: { userId: TEST_USER.id },
      })

      expect(after!.updatedAt.getTime()).toBeGreaterThan(
        before!.updatedAt.getTime()
      )
    })
  })

  describe('Idempotency', () => {
    it('should be idempotent - updating to same value', async () => {
      await getPreferences(TEST_USER.id)

      const response1 = await updatePreferences(TEST_USER.id, { uiLocale: 'zh' })
      const response2 = await updatePreferences(TEST_USER.id, { uiLocale: 'zh' })

      expect(response1.data.data.uiLocale).toBe('zh')
      expect(response2.data.data.uiLocale).toBe('zh')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors on update', async () => {
      vi.spyOn(prisma.userPreference, 'upsert').mockRejectedValueOnce(
        new Error('Database error')
      )

      const response = await updatePreferences(TEST_USER.id, { uiLocale: 'zh' })

      expect(response.status).toBe(500)
      expect(response.data.error.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR)
    })

    it('should handle malformed JSON', async () => {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Response Format', () => {
    it('should return updated preferences in response', async () => {
      const response = await updatePreferences(TEST_USER.id, {
        uiLocale: 'zh',
        explainLocale: 'en',
      })

      expect(response.data.success).toBe(true)
      expect(response.data.data).toBeDefined()
      expect(response.data.data.uiLocale).toBe('zh')
      expect(response.data.data.explainLocale).toBe('en')
    })

    it('should include all preference fields', async () => {
      const response = await updatePreferences(TEST_USER.id, { uiLocale: 'zh' })

      expect(response.data.data).toHaveProperty('id')
      expect(response.data.data).toHaveProperty('userId')
      expect(response.data.data).toHaveProperty('uiLocale')
      expect(response.data.data).toHaveProperty('explainLocale')
      expect(response.data.data).toHaveProperty('updatedAt')
    })
  })

  describe('Concurrent Updates', () => {
    it('should handle concurrent update requests', async () => {
      await getPreferences(TEST_USER.id)

      const updates = [
        updatePreferences(TEST_USER.id, { uiLocale: 'zh' }),
        updatePreferences(TEST_USER.id, { explainLocale: 'zh' }),
        updatePreferences(TEST_USER.id, { uiLocale: 'en' }),
      ]

      const responses = await Promise.all(updates)

      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })

      // Last update should win
      const final = await getPreferences(TEST_USER.id)
      expect(final.data.data.uiLocale).toBe('en')
    })
  })
})
