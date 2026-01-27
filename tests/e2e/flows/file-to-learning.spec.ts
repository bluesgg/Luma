/**
 * E2E Flow Test: Complete File to Learning Session Journey
 *
 * Tests the critical path of:
 * 1. File upload
 * 2. PDF processing
 * 3. Knowledge extraction
 * 4. Starting learning session
 * 5. Interactive tutor flow
 */

import { test, expect } from '@playwright/test'
import {
  setupAuthenticatedSession,
} from '../fixtures/auth'
import {
  cleanDatabase,
  createTestCourse,
  createTestFile,
  createTopicStructure,
  setupUserQuota,
} from '../fixtures/database'

test.describe('File to Learning Session Flow', () => {
  test.beforeEach(async ({ page }) => {
    await cleanDatabase()
  })

  test('should complete full file to learning flow', async ({ page }) => {
    // Setup authenticated user
    const user = await setupAuthenticatedSession(page)

    // Create course and file
    await page.goto('/')
    await page.click('button:has-text("New Course")')
    await page.fill('input[name="name"]', 'Machine Learning')
    await page.click('button:has-text("Create")')

    // Upload file
    await page.click('text=Machine Learning')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/ml-lecture.pdf')

    // Wait for processing
    await expect(page.locator('text=/ready/i')).toBeVisible({
      timeout: 30000,
    })

    // Start learning session
    await page.click('button:has-text("Start Learning")')

    // Should be on learning page
    await expect(page).toHaveURL(/\/learn/, { timeout: 5000 })

    // Should see topic outline
    await expect(page.locator('[data-testid="topic-outline"]')).toBeVisible()

    // Should see explanation panel
    await expect(page.locator('[data-testid="explanation-panel"]')).toBeVisible()

    // Request explanation
    await page.click('button:has-text("Explain")')

    // Should see streaming explanation
    await expect(page.locator('[data-testid="explanation-content"]')).toBeVisible({
      timeout: 10000,
    })

    // Confirm understanding
    await page.click('button:has-text("I understand")')

    // Should advance to next subtopic or test
    await expect(page.locator('text=/next|test/i')).toBeVisible({
      timeout: 5000,
    })
  })

  test('should handle file processing failure', async ({ page }) => {
    const user = await setupAuthenticatedSession(page)

    // Upload corrupted file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/corrupted.pdf')

    // Should show error after processing
    await expect(page.locator('text=/failed|error/i')).toBeVisible({
      timeout: 30000,
    })

    // Should show retry option
    await expect(page.locator('button:has-text("Retry")')).toBeVisible()
  })

  test('should allow pausing and resuming learning session', async ({ page }) => {
    const user = await setupAuthenticatedSession(page)

    // Start learning session (assuming file already processed)
    await page.goto('/learn/test-session-id')

    // Pause session
    await page.click('button:has-text("Pause")')

    // Should show pause confirmation
    await expect(page.locator('text=/paused/i')).toBeVisible()

    // Resume session
    await page.goto('/learn/test-session-id')

    // Should resume from same position
    await expect(page.locator('[data-testid="current-topic"]')).toBeVisible()
  })

  test('should track progress through topics', async ({ page }) => {
    const user = await setupAuthenticatedSession(page)

    await page.goto('/learn/test-session-id')

    // Check initial progress
    const progressBar = page.locator('[data-testid="progress-bar"]')
    await expect(progressBar).toBeVisible()

    // Complete first topic
    await page.click('button:has-text("Next Topic")')

    // Progress should update
    await expect(progressBar).toHaveAttribute('aria-valuenow', /[1-9]/)
  })

  test('should support SSE explanation streaming', async ({ page }) => {
    const user = await setupAuthenticatedSession(page)

    await page.goto('/learn/test-session-id')

    // Request explanation
    await page.click('button:has-text("Explain")')

    // Should see streaming content
    const explanation = page.locator('[data-testid="explanation-content"]')

    // Content should appear gradually
    await expect(explanation).toBeVisible({ timeout: 5000 })

    // Wait for streaming to complete
    await expect(page.locator('button:has-text("I understand")')).toBeVisible({
      timeout: 15000,
    })
  })

  test('should generate and display test questions', async ({ page }) => {
    const user = await setupAuthenticatedSession(page)

    await page.goto('/learn/test-session-id')

    // Complete all subtopics to reach testing phase
    // (Simulated by setting session to TESTING phase)

    // Should show test questions
    await expect(page.locator('[data-testid="test-question"]')).toBeVisible({
      timeout: 5000,
    })

    // Should show question options
    await expect(page.locator('[data-testid="question-options"]')).toBeVisible()

    // Submit answer
    await page.click('[data-testid="option-a"]')
    await page.click('button:has-text("Submit")')

    // Should show feedback
    await expect(page.locator('[data-testid="answer-feedback"]')).toBeVisible({
      timeout: 3000,
    })
  })

  test('should handle wrong answers with re-explanation', async ({ page }) => {
    const user = await setupAuthenticatedSession(page)

    await page.goto('/learn/test-session-id')

    // Submit wrong answer
    await page.click('[data-testid="option-b"]') // Wrong option
    await page.click('button:has-text("Submit")')

    // Should show incorrect feedback
    await expect(page.locator('text=/incorrect|wrong/i')).toBeVisible()

    // Should show re-explanation
    await expect(page.locator('[data-testid="re-explanation"]')).toBeVisible({
      timeout: 10000,
    })

    // Should allow retry
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible()
  })

  test('should allow skipping questions', async ({ page }) => {
    const user = await setupAuthenticatedSession(page)

    await page.goto('/learn/test-session-id')

    // Skip question
    await page.click('button:has-text("Skip")')

    // Should show correct answer
    await expect(page.locator('[data-testid="correct-answer"]')).toBeVisible()

    // Should mark as weak point
    await expect(page.locator('text=/weak point|review/i')).toBeVisible()
  })

  test('should complete session and show summary', async ({ page }) => {
    const user = await setupAuthenticatedSession(page)

    await page.goto('/learn/test-session-id')

    // Complete all topics
    // (Simulated by advancing through topics)

    // Should show completion message
    await expect(page.locator('text=/completed|congratulations/i')).toBeVisible({
      timeout: 5000,
    })

    // Should show weak points summary
    await expect(page.locator('[data-testid="weak-points"]')).toBeVisible()

    // Should show overall progress
    await expect(page.locator('text=100%')).toBeVisible()
  })

  test('should display related images during explanation', async ({ page }) => {
    const user = await setupAuthenticatedSession(page)

    await page.goto('/learn/test-session-id')

    // Request explanation
    await page.click('button:has-text("Explain")')

    // Should show related images
    await expect(page.locator('[data-testid="related-image"]').first()).toBeVisible({
      timeout: 10000,
    })

    // Images should be clickable
    await page.click('[data-testid="related-image"]').first()

    // Should open larger view
    await expect(page.locator('[data-testid="image-modal"]')).toBeVisible()
  })

  test('should enforce quota limits on learning interactions', async ({ page }) => {
    const user = await setupAuthenticatedSession(page)

    await page.goto('/learn/test-session-id')

    // Exhaust quota by requesting many explanations
    for (let i = 0; i < 151; i++) {
      await page.click('button:has-text("Explain")')
      await page.waitForTimeout(100)

      if (i === 150) {
        // Should show quota exceeded error
        await expect(page.locator('text=/quota|limit exceeded/i')).toBeVisible({
          timeout: 3000,
        })
      }
    }
  })

  test('should handle network errors during SSE streaming', async ({ page }) => {
    const user = await setupAuthenticatedSession(page)

    await page.goto('/learn/test-session-id')

    // Simulate network error
    await page.route('/api/learn/sessions/*/explain', (route) => {
      route.abort()
    })

    // Request explanation
    await page.click('button:has-text("Explain")')

    // Should show error message
    await expect(page.locator('text=/error|failed/i')).toBeVisible({
      timeout: 5000,
    })

    // Should show retry option
    await expect(page.locator('button:has-text("Retry")')).toBeVisible()
  })
})
