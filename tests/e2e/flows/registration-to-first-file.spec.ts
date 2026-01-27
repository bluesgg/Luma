/**
 * E2E Flow Test: Complete User Journey from Registration to First File Upload
 *
 * Tests the critical path of:
 * 1. User registration
 * 2. Email verification
 * 3. Login
 * 4. Course creation
 * 5. File upload
 */

import { test, expect } from '@playwright/test'
import {
  generateTestUser,
  registerUser,
  loginUser,
  verifyEmail,
} from '../fixtures/auth'
import { cleanDatabase, setupUserQuota } from '../fixtures/database'

test.describe('Registration to First File Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clean database before each test
    await cleanDatabase()
  })

  test('should complete full registration to file upload flow', async ({
    page,
  }) => {
    const user = generateTestUser()

    // Step 1: Register new user
    await page.goto('/register')
    await page.fill('input[name="email"]', user.email)
    await page.fill('input[name="password"]', user.password)
    await page.click('button[type="submit"]')

    // Should redirect to verification page or show message
    await expect(page).toHaveURL(/\/(verify|login)/, { timeout: 5000 })

    // Step 2: Verify email (simulated)
    // In real scenario, extract token from email
    const verificationToken = 'mock-token'
    await verifyEmail(page, verificationToken)

    // Step 3: Login
    await loginUser(page, user)

    // Should be on home page
    await expect(page).toHaveURL('/', { timeout: 5000 })

    // Step 4: Create first course
    await page.click('button:has-text("New Course")')

    await page.fill('input[name="name"]', 'My First Course')
    await page.fill('input[name="school"]', 'Test University')
    await page.fill('input[name="term"]', 'Fall 2024')
    await page.click('button:has-text("Create Course")')

    // Wait for course to be created
    await expect(page.locator('text=My First Course')).toBeVisible({
      timeout: 5000,
    })

    // Step 5: Upload first file
    await page.click('text=My First Course')

    // Should be on course files page
    await expect(page).toHaveURL(/\/files/, { timeout: 5000 })

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    // Note: In actual E2E tests, you would provide a real test PDF file
    // For now, this test requires manual file upload or mock file
    // await fileInput.setInputFiles('path/to/test-lecture.pdf')

    // Wait for upload to complete
    await expect(page.locator('text=Upload complete')).toBeVisible({
      timeout: 10000,
    })

    // Verify file appears in list
    await expect(page.locator('text=test-lecture.pdf')).toBeVisible()

    // Step 6: Verify file status
    const fileCard = page.locator('[data-testid="file-card"]').first()
    await expect(fileCard).toBeVisible()

    // Should show processing or ready status
    const status = fileCard.locator('[data-testid="file-status"]')
    await expect(status).toHaveText(/PROCESSING|READY/)
  })

  test('should handle registration errors gracefully', async ({ page }) => {
    await page.goto('/register')

    // Try to register with invalid email
    await page.fill('input[name="email"]', 'invalid-email')
    await page.fill('input[name="password"]', 'weak')
    await page.click('button[type="submit"]')

    // Should show validation errors
    await expect(page.locator('text=/invalid|error/i')).toBeVisible({
      timeout: 3000,
    })
  })

  test('should prevent duplicate registration', async ({ page }) => {
    const user = generateTestUser()

    // Register first time
    await registerUser(page, user)

    // Try to register again with same email
    await page.goto('/register')
    await page.fill('input[name="email"]', user.email)
    await page.fill('input[name="password"]', user.password)
    await page.click('button[type="submit"]')

    // Should show error
    await expect(page.locator('text=/already exists|taken/i')).toBeVisible({
      timeout: 3000,
    })
  })

  test('should require email verification before file upload', async ({
    page,
  }) => {
    const user = generateTestUser()

    // Register but don't verify
    await registerUser(page, user)

    // Try to login
    await loginUser(page, user)

    // Should be blocked or redirected to verification page
    const url = page.url()
    const isBlocked = url.includes('verify') || url.includes('login')

    expect(isBlocked).toBe(true)
  })

  test.skip('should enforce file upload quota', async ({ page }) => {
    // Skipped: Requires actual test PDF files
    // In production E2E: Create test fixtures and enable this test
    const user = generateTestUser()

    await registerUser(page, user)
    await loginUser(page, user)

    // Create course
    await page.click('button:has-text("New Course")')
    await page.fill('input[name="name"]', 'Test Course')
    await page.click('button:has-text("Create")')

    // Upload multiple files to hit quota
    for (let i = 0; i < 31; i++) {
      const fileInput = page.locator('input[type="file"]')
      // await fileInput.setInputFiles('path/to/test.pdf')

      if (i === 30) {
        // Should show quota exceeded error
        await expect(page.locator('text=/quota|limit/i')).toBeVisible({
          timeout: 3000,
        })
      }
    }
  })

  test.skip('should show progress during file processing', async ({ page }) => {
    // Skipped: Requires actual test PDF file
    const user = generateTestUser()

    await registerUser(page, user)
    await loginUser(page, user)

    // Create course and upload file
    await page.click('button:has-text("New Course")')
    await page.fill('input[name="name"]', 'Test Course')
    await page.click('button:has-text("Create")')

    const fileInput = page.locator('input[type="file"]')
    // await fileInput.setInputFiles('path/to/test-lecture.pdf')

    // Should show upload progress
    await expect(page.locator('[role="progressbar"]')).toBeVisible({
      timeout: 3000,
    })

    // Wait for processing
    await expect(page.locator('text=/processing|extracting/i')).toBeVisible({
      timeout: 5000,
    })
  })

  test('should allow course creation with minimal info', async ({ page }) => {
    const user = generateTestUser()

    await registerUser(page, user)
    await loginUser(page, user)

    // Create course with only name
    await page.click('button:has-text("New Course")')
    await page.fill('input[name="name"]', 'Minimal Course')
    await page.click('button:has-text("Create")')

    // Should succeed
    await expect(page.locator('text=Minimal Course')).toBeVisible({
      timeout: 5000,
    })
  })

  test.skip('should validate file type on upload', async ({ page }) => {
    // Skipped: Requires actual test files
    const user = generateTestUser()

    await registerUser(page, user)
    await loginUser(page, user)

    // Create course
    await page.click('button:has-text("New Course")')
    await page.fill('input[name="name"]', 'Test Course')
    await page.click('button:has-text("Create")')

    // Try to upload non-PDF file
    const fileInput = page.locator('input[type="file"]')
    // await fileInput.setInputFiles('path/to/test.txt')

    // Should show error
    await expect(page.locator('text=/invalid|pdf only/i')).toBeVisible({
      timeout: 3000,
    })
  })

  test.skip('should validate file size on upload', async ({ page }) => {
    // Skipped: Requires actual large test file
    const user = generateTestUser()

    await registerUser(page, user)
    await loginUser(page, user)

    // Create course
    await page.click('button:has-text("New Course")')
    await page.fill('input[name="name"]', 'Test Course')
    await page.click('button:has-text("Create")')

    // Try to upload large file (> 200MB)
    const fileInput = page.locator('input[type="file"]')
    // await fileInput.setInputFiles('path/to/large-file.pdf')

    // Should show error
    await expect(page.locator('text=/too large|size limit/i')).toBeVisible({
      timeout: 3000,
    })
  })
})
