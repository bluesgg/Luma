import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Multi-File Upload Feature
 *
 * These tests verify the complete upload workflow from user interaction
 * to file processing in a real browser environment.
 *
 * Prerequisites:
 * - Database seeded with test user and course
 * - R2 storage configured
 * - Upload API endpoints working
 */

test.describe('File Upload', () => {
  let testCourseId: string

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Wait for redirect to courses page
    await page.waitForURL('/courses')

    // Create test course
    await page.click('button:has-text("New Course")')
    await page.fill('input[name="name"]', 'Test Course - Upload E2E')
    await page.click('button:has-text("Create")')

    // Get course ID from URL
    await page.waitForURL(/\/courses\/.*/)
    const url = page.url()
    testCourseId = url.split('/').pop() || ''
  })

  test.afterEach(async ({ page }) => {
    // Cleanup: Delete test course
    if (testCourseId) {
      await page.goto(`/courses/${testCourseId}`)
      await page.click('button:has-text("Settings")')
      await page.click('button:has-text("Delete Course")')
      await page.click('button:has-text("Confirm")')
    }
  })

  // ============================================
  // TEST 1: Single File Upload
  // ============================================
  test('uploads single PDF file successfully', async ({ page }) => {
    await page.goto(`/courses/${testCourseId}`)

    // Select file via file picker
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./tests/fixtures/sample.pdf')

    // Verify file appears in queue
    await expect(page.getByText('sample.pdf')).toBeVisible()
    await expect(page.getByText(/waiting/i)).toBeVisible()

    // Wait for upload to start
    await expect(page.getByText(/uploading/i)).toBeVisible({ timeout: 5000 })

    // Verify progress bar appears
    const progressBar = page.getByRole('progressbar')
    await expect(progressBar).toBeVisible()

    // Wait for processing
    await expect(page.getByText(/processing/i)).toBeVisible({ timeout: 10000 })

    // Wait for completion
    await expect(page.getByText(/complete/i)).toBeVisible({ timeout: 30000 })

    // Verify file appears in file list
    await page.click('button:has-text("Files")')
    await expect(page.getByText('sample.pdf')).toBeVisible()
  })

  // ============================================
  // TEST 2: Multiple File Upload
  // ============================================
  test('uploads multiple files concurrently', async ({ page }) => {
    await page.goto(`/courses/${testCourseId}`)

    // Select multiple files
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([
      './tests/fixtures/file1.pdf',
      './tests/fixtures/file2.pdf',
      './tests/fixtures/file3.pdf',
      './tests/fixtures/file4.pdf',
    ])

    // Verify all files in queue
    await expect(page.getByText('file1.pdf')).toBeVisible()
    await expect(page.getByText('file2.pdf')).toBeVisible()
    await expect(page.getByText('file3.pdf')).toBeVisible()
    await expect(page.getByText('file4.pdf')).toBeVisible()

    // Verify concurrent upload limit (max 3 uploading at once)
    await page.waitForTimeout(1000) // Wait for uploads to start
    const uploadingItems = await page.getByText(/uploading/i).count()
    expect(uploadingItems).toBeLessThanOrEqual(3)

    // Wait for all to complete
    await expect(page.getByText(/4 of 4 completed/i)).toBeVisible({ timeout: 60000 })
  })

  // ============================================
  // TEST 3: Drag and Drop Upload
  // ============================================
  test('uploads file via drag and drop', async ({ page }) => {
    await page.goto(`/courses/${testCourseId}`)

    // Get drop zone
    const dropZone = page.getByTestId('file-upload-zone')

    // Create data transfer with file
    const buffer = await page.evaluate(async () => {
      const response = await fetch('./tests/fixtures/sample.pdf')
      const arrayBuffer = await response.arrayBuffer()
      return Array.from(new Uint8Array(arrayBuffer))
    })

    const dataTransfer = await page.evaluateHandle((buffer) => {
      const file = new File([new Uint8Array(buffer)], 'dragged.pdf', {
        type: 'application/pdf',
      })
      const dt = new DataTransfer()
      dt.items.add(file)
      return dt
    }, buffer)

    // Trigger drop event
    await dropZone.dispatchEvent('drop', { dataTransfer })

    // Verify file in queue
    await expect(page.getByText('dragged.pdf')).toBeVisible()

    // Wait for completion
    await expect(page.getByText(/complete/i)).toBeVisible({ timeout: 30000 })
  })

  // ============================================
  // TEST 4: Invalid File Rejection
  // ============================================
  test('rejects non-PDF files', async ({ page }) => {
    await page.goto(`/courses/${testCourseId}`)

    // Try to upload non-PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./tests/fixtures/document.txt')

    // Verify error message
    await expect(page.getByText(/only pdf files are allowed/i)).toBeVisible()

    // Verify file shows as failed
    await expect(page.getByText('document.txt')).toBeVisible()
    await expect(page.getByTestId('error-icon')).toBeVisible()
  })

  test('rejects files larger than 200MB', async ({ page }) => {
    await page.goto(`/courses/${testCourseId}`)

    // Try to upload oversized file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./tests/fixtures/large-file.pdf')

    // Verify error message
    await expect(page.getByText(/200 mb limit/i)).toBeVisible()

    // Verify file shows as failed
    await expect(page.getByTestId('error-icon')).toBeVisible()
  })

  // ============================================
  // TEST 5: Cancel Upload
  // ============================================
  test('cancels upload in progress', async ({ page }) => {
    await page.goto(`/courses/${testCourseId}`)

    // Upload large file to have time to cancel
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./tests/fixtures/large-sample.pdf')

    // Wait for upload to start
    await expect(page.getByText(/uploading/i)).toBeVisible()

    // Click cancel
    await page.click('button[aria-label="Cancel upload"]')

    // Verify file removed or marked as cancelled
    const cancelledText = page.getByText(/cancelled/i)
    await expect(cancelledText).toBeVisible()
  })

  // ============================================
  // TEST 6: Retry Failed Upload
  // ============================================
  test('retries failed upload', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/files/upload-url', (route) => {
      route.abort('failed')
    })

    await page.goto(`/courses/${testCourseId}`)

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./tests/fixtures/sample.pdf')

    // Wait for failure
    await expect(page.getByText(/failed/i)).toBeVisible({ timeout: 10000 })

    // Remove network intercept
    await page.unroute('**/api/files/upload-url')

    // Click retry
    await page.click('button[aria-label="Retry upload"]')

    // Verify upload starts again
    await expect(page.getByText(/uploading/i)).toBeVisible()

    // Wait for completion
    await expect(page.getByText(/complete/i)).toBeVisible({ timeout: 30000 })
  })

  // ============================================
  // TEST 7: File Limit Enforcement
  // ============================================
  test('enforces 30 file limit per course', async ({ page }) => {
    // Upload 30 files first
    await page.goto(`/courses/${testCourseId}`)

    for (let i = 0; i < 30; i++) {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles('./tests/fixtures/sample.pdf')
      await page.waitForTimeout(500)
    }

    // Wait for all to complete
    await expect(page.getByText(/30 of 30 completed/i)).toBeVisible({
      timeout: 120000,
    })

    // Try to upload 31st file
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeDisabled()

    // Verify warning message
    await expect(page.getByText(/no files remaining/i)).toBeVisible()
  })

  // ============================================
  // TEST 8: Remove Completed Upload
  // ============================================
  test('removes completed upload from queue', async ({ page }) => {
    await page.goto(`/courses/${testCourseId}`)

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./tests/fixtures/sample.pdf')

    // Wait for completion
    await expect(page.getByText(/complete/i)).toBeVisible({ timeout: 30000 })

    // Click remove
    await page.click('button[aria-label="Remove from queue"]')

    // Verify file removed from queue
    await expect(page.getByText('sample.pdf')).not.toBeVisible()
  })

  // ============================================
  // TEST 9: Clear All Uploads
  // ============================================
  test('clears all completed/failed uploads', async ({ page }) => {
    await page.goto(`/courses/${testCourseId}`)

    // Upload multiple files
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([
      './tests/fixtures/file1.pdf',
      './tests/fixtures/file2.pdf',
      './tests/fixtures/file3.pdf',
    ])

    // Wait for completion
    await expect(page.getByText(/3 of 3 completed/i)).toBeVisible({ timeout: 60000 })

    // Click clear all
    await page.click('button:has-text("Clear All")')

    // Verify queue empty
    await expect(page.getByTestId('upload-queue')).not.toBeVisible()
  })

  // ============================================
  // TEST 10: Progress Tracking
  // ============================================
  test('displays accurate progress during upload', async ({ page }) => {
    await page.goto(`/courses/${testCourseId}`)

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./tests/fixtures/medium-file.pdf')

    // Wait for upload to start
    await expect(page.getByText(/uploading/i)).toBeVisible()

    // Verify progress increases
    const progressText = page.locator('text=/\\d+%/')

    let previousProgress = 0
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(1000)
      const text = await progressText.textContent()
      const currentProgress = parseInt(text?.match(/\\d+/)?.[0] || '0')

      expect(currentProgress).toBeGreaterThanOrEqual(previousProgress)
      previousProgress = currentProgress

      if (currentProgress === 100) break
    }
  })

  // ============================================
  // TEST 11: Accessibility
  // ============================================
  test('is keyboard accessible', async ({ page }) => {
    await page.goto(`/courses/${testCourseId}`)

    // Tab to file input
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Open file picker with Enter
    await page.keyboard.press('Enter')

    // Verify file input focused
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeFocused()

    // Upload file
    await fileInput.setInputFiles('./tests/fixtures/sample.pdf')

    // Wait for completion
    await expect(page.getByText(/complete/i)).toBeVisible({ timeout: 30000 })

    // Tab to remove button
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Remove with Enter
    await page.keyboard.press('Enter')

    // Verify file removed
    await expect(page.getByText('sample.pdf')).not.toBeVisible()
  })

  test('announces status to screen readers', async ({ page }) => {
    await page.goto(`/courses/${testCourseId}`)

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./tests/fixtures/sample.pdf')

    // Verify aria-live region exists
    const statusRegion = page.getByRole('status')
    await expect(statusRegion).toHaveAttribute('aria-live', 'polite')

    // Verify status announcements
    await expect(statusRegion).toContainText(/waiting|uploading|processing|complete/i)
  })
})

/**
 * Performance Tests
 */
test.describe('Upload Performance', () => {
  test('uploads 10 files in under 2 minutes', async ({ page }) => {
    await page.goto('/courses/test')

    const startTime = Date.now()

    // Upload 10 files
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([
      './tests/fixtures/file1.pdf',
      './tests/fixtures/file2.pdf',
      './tests/fixtures/file3.pdf',
      './tests/fixtures/file4.pdf',
      './tests/fixtures/file5.pdf',
      './tests/fixtures/file6.pdf',
      './tests/fixtures/file7.pdf',
      './tests/fixtures/file8.pdf',
      './tests/fixtures/file9.pdf',
      './tests/fixtures/file10.pdf',
    ])

    // Wait for completion
    await expect(page.getByText(/10 of 10 completed/i)).toBeVisible({
      timeout: 120000, // 2 minutes
    })

    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(120000) // Under 2 minutes
  })

  test('maintains UI responsiveness during upload', async ({ page }) => {
    await page.goto('/courses/test')

    // Upload large file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./tests/fixtures/large-file.pdf')

    // Verify UI still responsive
    await page.click('button:has-text("Settings")')
    await expect(page.getByText('Course Settings')).toBeVisible()

    // Navigate away and back
    await page.click('button:has-text("Files")')
    await page.click('button:has-text("Settings")')

    // Upload should continue in background
    await expect(page.getByText(/uploading/i)).toBeVisible()
  })
})
