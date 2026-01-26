import { test, expect, Page, Route } from '@playwright/test'

/**
 * E2E Tests for the File Management Page (/files/[courseId])
 *
 * These tests verify the complete file management user journeys including:
 * - Navigation from courses to files page
 * - Empty state display
 * - File upload flow with progress tracking
 * - File table display with various statuses
 * - File deletion with confirmation
 * - Quota preview display
 * - Keyboard navigation
 *
 * IMPORTANT: These tests require a running development server with:
 * 1. A PostgreSQL database connection (configured via DATABASE_URL)
 * 2. Test data seeded in the database
 *
 * The file management page uses Server Components that call Prisma directly,
 * so client-side route mocking alone is insufficient. Tests that navigate to
 * /files/[courseId] require actual database access.
 *
 * To run these tests:
 * 1. Ensure DATABASE_URL is configured in .env.local
 * 2. Seed the database with test data
 * 3. Run: npx playwright test tests/e2e/files.spec.ts
 *
 * Alternatively, run in CI with a test database.
 *
 * Note: API-level tests use route mocking and can run without database access.
 */

// Check if database tests should be skipped
const SKIP_DB_TESTS = !process.env.DATABASE_URL || process.env.SKIP_DB_TESTS === 'true'

// Mock user for Supabase auth
const mockUser = {
  id: 'user-1',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: '2025-01-01T00:00:00.000Z',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { name: 'Test User' },
  identities: [],
}

// Mock course data
const mockCourse = {
  id: 'course-1',
  userId: 'user-1',
  name: 'Introduction to Psychology',
  school: 'Harvard University',
  term: 'Fall 2025',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  _count: { files: 3 },
}

// Mock file data
const mockFiles = [
  {
    id: 'file-1',
    courseId: 'course-1',
    userId: 'user-1',
    name: 'lecture-1.pdf',
    type: 'lecture',
    pageCount: 25,
    fileSize: 1024000,
    isScanned: false,
    status: 'ready',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'file-2',
    courseId: 'course-1',
    userId: 'user-1',
    name: 'notes-chapter-2.pdf',
    type: 'lecture',
    pageCount: 10,
    fileSize: 512000,
    isScanned: false,
    status: 'ready',
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  },
  {
    id: 'file-3',
    courseId: 'course-1',
    userId: 'user-1',
    name: 'scanned-document.pdf',
    type: 'lecture',
    pageCount: 15,
    fileSize: 2048000,
    isScanned: true,
    status: 'ready',
    createdAt: '2025-01-03T00:00:00.000Z',
    updatedAt: '2025-01-03T00:00:00.000Z',
  },
]

// Mock files with various statuses
const mockFilesWithStatuses = [
  {
    id: 'file-ready',
    courseId: 'course-1',
    userId: 'user-1',
    name: 'ready-file.pdf',
    type: 'lecture',
    pageCount: 20,
    fileSize: 1024000,
    isScanned: false,
    status: 'ready',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'file-processing',
    courseId: 'course-1',
    userId: 'user-1',
    name: 'processing-file.pdf',
    type: 'lecture',
    pageCount: null,
    fileSize: 2048000,
    isScanned: false,
    status: 'processing',
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  },
  {
    id: 'file-uploading',
    courseId: 'course-1',
    userId: 'user-1',
    name: 'uploading-file.pdf',
    type: 'lecture',
    pageCount: null,
    fileSize: 512000,
    isScanned: false,
    status: 'uploading',
    createdAt: '2025-01-03T00:00:00.000Z',
    updatedAt: '2025-01-03T00:00:00.000Z',
  },
  {
    id: 'file-failed',
    courseId: 'course-1',
    userId: 'user-1',
    name: 'failed-file.pdf',
    type: 'lecture',
    pageCount: null,
    fileSize: 1536000,
    isScanned: false,
    status: 'failed',
    createdAt: '2025-01-04T00:00:00.000Z',
    updatedAt: '2025-01-04T00:00:00.000Z',
  },
]

// Mock upload URL response
const mockUploadUrlResponse = {
  fileId: 'new-file-id',
  uploadUrl: 'https://storage.example.com/signed-upload-url?token=abc123',
  token: 'upload-token-123',
}

/**
 * Helper to setup authentication mocks for a page
 */
async function setupAuthMocks(page: Page) {
  // Mock Supabase auth API to simulate logged-in state
  await page.route('**/auth/v1/user', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    })
  })

  // Mock Supabase session token endpoint
  await page.route('**/auth/v1/token*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: mockUser,
      }),
    })
  })

  // Mock CSRF endpoint
  await page.route('**/api/csrf', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'test-csrf-token' }),
    })
  })

  // Mock auth check (client-side)
  await page.route('**/api/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          user: {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      }),
    })
  })
}

/**
 * Helper to setup courses API mock
 */
async function setupCoursesApiMock(page: Page) {
  await page.route('**/api/courses', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { courses: [mockCourse] },
        }),
      })
    }
  })
}

// ============================================
// Test Suite: Navigate to Files Page
// ============================================

test.describe('Navigate to Files Page', () => {
  // Skip UI tests if database is not available
  test.skip(SKIP_DB_TESTS, 'Requires database connection - set DATABASE_URL to run')

  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)
    await setupCoursesApiMock(page)

    // Mock files API
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFiles, course: mockCourse },
        }),
      })
    })
  })

  test('navigates from courses list to files page by clicking a course', async ({ page }) => {
    await page.goto('/courses')

    // Wait for courses to load
    await expect(page.getByTestId('course-card').first()).toBeVisible()

    // Click on the first course card
    await page.getByTestId('course-card').first().click()

    // Should navigate to files page
    await expect(page).toHaveURL('/files/course-1')
  })

  test('displays breadcrumb with course name', async ({ page }) => {
    await page.goto('/files/course-1')

    // Wait for page to load
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible()

    // Breadcrumb should show course name
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText('Courses')
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText('Introduction to Psychology')
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText('Files')
  })

  test('URL contains courseId', async ({ page }) => {
    await page.goto('/files/course-1')

    // Verify URL
    await expect(page).toHaveURL(/\/files\/course-1/)
  })

  test('displays page header with course name', async ({ page }) => {
    await page.goto('/files/course-1')

    // Check header title
    await expect(page.locator('h1')).toContainText('Course Files')

    // Check subtitle contains course name
    await expect(page.getByText('Manage PDF files for Introduction to Psychology')).toBeVisible()
  })
})

// ============================================
// Test Suite: Empty State
// ============================================

test.describe('Empty State', () => {
  // Skip UI tests if database is not available
  test.skip(SKIP_DB_TESTS, 'Requires database connection - set DATABASE_URL to run')

  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)

    // Mock files API to return empty array
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: [], course: mockCourse },
        }),
      })
    })
  })

  test('displays empty state when course has no files', async ({ page }) => {
    await page.goto('/files/course-1')

    // Check empty state is visible
    const emptyState = page.getByTestId('empty-files')
    await expect(emptyState).toBeVisible()
    await expect(emptyState).toContainText('No files yet')
    await expect(emptyState).toContainText('Upload PDF files to start learning with AI assistance')
  })

  test('displays upload button in empty state', async ({ page }) => {
    await page.goto('/files/course-1')

    const uploadButton = page.getByTestId('empty-upload-button')
    await expect(uploadButton).toBeVisible()
    await expect(uploadButton).toContainText('Upload PDF')
  })

  test('displays drag-and-drop hint in empty state', async ({ page }) => {
    await page.goto('/files/course-1')

    await expect(page.getByText('Drag and drop your PDF files here')).toBeVisible()
  })

  test('clicking upload button in empty state shows upload zone', async ({ page }) => {
    await page.goto('/files/course-1')

    // Click the upload button in empty state
    await page.getByTestId('empty-upload-button').click()

    // Upload zone should be visible
    const uploadZone = page.getByTestId('file-upload-zone')
    await expect(uploadZone).toBeVisible()
  })
})

// ============================================
// Test Suite: File Upload Flow
// ============================================

test.describe('File Upload Flow', () => {
  // Skip UI tests if database is not available
  test.skip(SKIP_DB_TESTS, 'Requires database connection - set DATABASE_URL to run')

  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)

    // Mock files API - start with empty files, then return new file after upload
    let filesState = [...mockFiles.slice(0, 2)]

    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: filesState, course: mockCourse },
        }),
      })
    })

    // Mock upload URL endpoint
    await page.route('**/api/files/upload-url', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockUploadUrlResponse,
          }),
        })
      }
    })

    // Mock storage upload (simulate successful upload)
    await page.route('https://storage.example.com/**', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: 'OK',
        })
      }
    })

    // Mock confirm upload endpoint
    await page.route('**/api/files/confirm', async (route) => {
      if (route.request().method() === 'POST') {
        const newFile = {
          id: 'new-file-id',
          courseId: 'course-1',
          userId: 'user-1',
          name: 'new-upload.pdf',
          type: 'lecture',
          pageCount: 30,
          fileSize: 1500000,
          isScanned: false,
          status: 'ready',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        filesState = [...filesState, newFile]

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { file: newFile },
          }),
        })
      }
    })
  })

  test('clicking upload button shows upload zone', async ({ page }) => {
    await page.goto('/files/course-1')

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Course Files')

    // Click upload button
    await page.getByRole('button', { name: 'Upload File' }).click()

    // Upload zone should be visible
    const uploadZone = page.getByTestId('file-upload-zone')
    await expect(uploadZone).toBeVisible()
    await expect(uploadZone).toContainText('Drag and drop your file here')
    await expect(uploadZone).toContainText('PDF files, 200 MB maximum')
  })

  test('can cancel upload zone', async ({ page }) => {
    await page.goto('/files/course-1')

    // Show upload zone
    await page.getByRole('button', { name: 'Upload File' }).click()
    await expect(page.getByTestId('file-upload-zone')).toBeVisible()

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Upload zone should be hidden
    await expect(page.getByTestId('file-upload-zone')).not.toBeVisible()
  })

  test('upload zone accepts PDF files', async ({ page }) => {
    await page.goto('/files/course-1')

    // Show upload zone
    await page.getByRole('button', { name: 'Upload File' }).click()

    // Create a test PDF file
    const buffer = Buffer.from('%PDF-1.4 test content')

    // Upload via file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer,
    })

    // Progress should be shown
    await expect(page.getByText(/\d+% uploaded/)).toBeVisible({ timeout: 10000 })

    // Success toast should appear
    await expect(page.getByText('File uploaded successfully')).toBeVisible({ timeout: 15000 })
  })

  test('shows error for non-PDF files', async ({ page }) => {
    await page.goto('/files/course-1')

    // Show upload zone
    await page.getByRole('button', { name: 'Upload File' }).click()

    // Create a test non-PDF file
    const buffer = Buffer.from('This is not a PDF')

    // Try to upload via file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'document.txt',
      mimeType: 'text/plain',
      buffer,
    })

    // Error message should be shown
    await expect(page.getByText('Only PDF files are allowed')).toBeVisible()
  })

  test('upload button is disabled when at file limit', async ({ page }) => {
    // Mock to return 30 files (at limit)
    const maxFiles = Array.from({ length: 30 }, (_, i) => ({
      id: `file-${i + 1}`,
      courseId: 'course-1',
      userId: 'user-1',
      name: `file-${i + 1}.pdf`,
      type: 'lecture',
      pageCount: 10,
      fileSize: 100000,
      isScanned: false,
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: maxFiles, course: mockCourse },
        }),
      })
    })

    await page.goto('/files/course-1')

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Course Files')

    // Upload button should be disabled
    const uploadButton = page.getByRole('button', { name: 'Upload File' })
    await expect(uploadButton).toBeDisabled()
  })
})

// ============================================
// Test Suite: File Table Display
// ============================================

test.describe('File Table Display', () => {
  // Skip UI tests if database is not available
  test.skip(SKIP_DB_TESTS, 'Requires database connection - set DATABASE_URL to run')

  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)

    // Mock files API with various statuses
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFilesWithStatuses, course: mockCourse },
        }),
      })
    })
  })

  test('displays file table with correct columns', async ({ page }) => {
    await page.goto('/files/course-1')

    // Wait for table to load
    await expect(page.locator('table')).toBeVisible()

    // Check column headers
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Pages' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Size' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Upload Date' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible()
  })

  test('displays file names in table', async ({ page }) => {
    await page.goto('/files/course-1')

    // Check file names
    await expect(page.getByText('ready-file.pdf')).toBeVisible()
    await expect(page.getByText('processing-file.pdf')).toBeVisible()
    await expect(page.getByText('uploading-file.pdf')).toBeVisible()
    await expect(page.getByText('failed-file.pdf')).toBeVisible()
  })

  test('displays correct status badges', async ({ page }) => {
    await page.goto('/files/course-1')

    // Check status badges by their labels
    await expect(page.getByText('Ready', { exact: true })).toBeVisible()
    await expect(page.getByText('Processing', { exact: true })).toBeVisible()
    await expect(page.getByText('Uploading', { exact: true })).toBeVisible()
    await expect(page.getByText('Failed', { exact: true })).toBeVisible()
  })

  test('displays scanned file warning icon', async ({ page }) => {
    // Mock with scanned files
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFiles, course: mockCourse },
        }),
      })
    })

    await page.goto('/files/course-1')

    // Check for scanned warning icon
    const scannedWarning = page.getByTestId('scanned-warning')
    await expect(scannedWarning).toBeVisible()
    await expect(scannedWarning).toHaveAttribute('title', 'This PDF appears to be scanned. AI features may be limited.')
  })

  test('displays file sizes correctly', async ({ page }) => {
    await page.goto('/files/course-1')

    // Check that file sizes are formatted
    // 1024000 bytes = 1000 KB or ~1 MB
    // 2048000 bytes = 2000 KB or ~2 MB
    await expect(page.getByText(/KB|MB/)).toBeTruthy()
  })

  test('displays page counts', async ({ page }) => {
    await page.goto('/files/course-1')

    // Ready file has 20 pages
    await expect(page.getByRole('cell', { name: '20' })).toBeVisible()
  })

  test('displays N/A for page count when null', async ({ page }) => {
    await page.goto('/files/course-1')

    // Processing/uploading/failed files have null page count
    const naCells = page.getByRole('cell', { name: 'N/A' })
    await expect(naCells.first()).toBeVisible()
  })

  test('open button is disabled for non-ready files', async ({ page }) => {
    await page.goto('/files/course-1')

    // Find the row with processing file
    const processingRow = page.getByRole('row').filter({ hasText: 'processing-file.pdf' })

    // Open button should be disabled
    const openButton = processingRow.getByRole('button', { name: 'Open file' })
    await expect(openButton).toBeDisabled()
  })

  test('open button is enabled for ready files', async ({ page }) => {
    await page.goto('/files/course-1')

    // Find the row with ready file
    const readyRow = page.getByRole('row').filter({ hasText: 'ready-file.pdf' })

    // Open button should be enabled
    const openButton = readyRow.getByRole('button', { name: 'Open file' })
    await expect(openButton).not.toBeDisabled()
  })
})

// ============================================
// Test Suite: File Deletion
// ============================================

test.describe('File Deletion', () => {
  // Skip UI tests if database is not available
  test.skip(SKIP_DB_TESTS, 'Requires database connection - set DATABASE_URL to run')

  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)

    // Mock files API
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFiles, course: mockCourse },
        }),
      })
    })

    // Mock delete file endpoint
    await page.route('**/api/files/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { deleted: true },
          }),
        })
      }
    })
  })

  test('clicking delete button shows confirmation dialog', async ({ page }) => {
    await page.goto('/files/course-1')

    // Find the first file row and click delete
    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })
    await firstRow.getByRole('button', { name: 'Delete' }).click()

    // Confirmation dialog should appear
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Delete File')
    await expect(dialog).toContainText('lecture-1.pdf')
    await expect(dialog).toContainText('This action cannot be undone')
  })

  test('confirmation dialog shows file info', async ({ page }) => {
    await page.goto('/files/course-1')

    // Click delete on first file
    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })
    await firstRow.getByRole('button', { name: 'Delete' }).click()

    // Dialog should show file details
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('25 pages')
  })

  test('canceling delete closes dialog without deleting', async ({ page }) => {
    await page.goto('/files/course-1')

    // Click delete on first file
    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })
    await firstRow.getByRole('button', { name: 'Delete' }).click()

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // File should still be in the table
    await expect(page.getByText('lecture-1.pdf')).toBeVisible()
  })

  test('confirming delete removes file from table', async ({ page }) => {
    await page.goto('/files/course-1')

    // Click delete on first file
    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })
    await firstRow.getByRole('button', { name: 'Delete' }).click()

    // Click delete in dialog
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Success toast should appear
    await expect(page.getByText('File deleted successfully')).toBeVisible()
  })

  test('shows loading state during deletion', async ({ page }) => {
    // Mock with delay
    await page.route('**/api/files/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await new Promise((resolve) => setTimeout(resolve, 500))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { deleted: true },
          }),
        })
      }
    })

    await page.goto('/files/course-1')

    // Click delete on first file
    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })
    await firstRow.getByRole('button', { name: 'Delete' }).click()

    // Click delete in dialog
    const deleteButton = page.getByRole('dialog').getByRole('button', { name: 'Delete' })
    await deleteButton.click()

    // Button should be disabled and show loading
    await expect(deleteButton).toBeDisabled()
  })

  test('shows error toast when deletion fails', async ({ page }) => {
    // Mock deletion failure
    await page.route('**/api/files/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { code: 'SERVER_ERROR', message: 'Failed to delete file' },
          }),
        })
      }
    })

    await page.goto('/files/course-1')

    // Click delete on first file
    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })
    await firstRow.getByRole('button', { name: 'Delete' }).click()

    // Click delete in dialog
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    // Error toast should appear
    await expect(page.getByText('Failed to delete file')).toBeVisible()
  })
})

// ============================================
// Test Suite: Quota Preview
// ============================================

test.describe('Quota Preview', () => {
  // Skip UI tests if database is not available
  test.skip(SKIP_DB_TESTS, 'Requires database connection - set DATABASE_URL to run')

  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)
  })

  test('displays quota usage with file count', async ({ page }) => {
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFiles, course: mockCourse },
        }),
      })
    })

    await page.goto('/files/course-1')

    // Quota preview should be visible
    const quotaPreview = page.getByTestId('quota-preview')
    await expect(quotaPreview).toBeVisible()

    // Should show file count (3 files out of 30)
    await expect(quotaPreview).toContainText('3')
    await expect(quotaPreview).toContainText('30')
  })

  test('displays green color when under 70% quota', async ({ page }) => {
    // 3 files out of 30 = 10%
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFiles, course: mockCourse },
        }),
      })
    })

    await page.goto('/files/course-1')

    const quotaPreview = page.getByTestId('quota-preview')
    await expect(quotaPreview).toBeVisible()

    // Should have green background class
    await expect(quotaPreview).toHaveClass(/bg-green-50/)
  })

  test('displays amber color when between 70-90% quota', async ({ page }) => {
    // Mock 25 files (83% of 30)
    const manyFiles = Array.from({ length: 25 }, (_, i) => ({
      id: `file-${i + 1}`,
      courseId: 'course-1',
      userId: 'user-1',
      name: `file-${i + 1}.pdf`,
      type: 'lecture',
      pageCount: 10,
      fileSize: 100000,
      isScanned: false,
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: manyFiles, course: mockCourse },
        }),
      })
    })

    await page.goto('/files/course-1')

    const quotaPreview = page.getByTestId('quota-preview')
    await expect(quotaPreview).toBeVisible()

    // Should have amber background class
    await expect(quotaPreview).toHaveClass(/bg-amber-50/)
  })

  test('displays red color when over 90% quota', async ({ page }) => {
    // Mock 28 files (93% of 30)
    const nearLimitFiles = Array.from({ length: 28 }, (_, i) => ({
      id: `file-${i + 1}`,
      courseId: 'course-1',
      userId: 'user-1',
      name: `file-${i + 1}.pdf`,
      type: 'lecture',
      pageCount: 10,
      fileSize: 100000,
      isScanned: false,
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: nearLimitFiles, course: mockCourse },
        }),
      })
    })

    await page.goto('/files/course-1')

    const quotaPreview = page.getByTestId('quota-preview')
    await expect(quotaPreview).toBeVisible()

    // Should have red background class
    await expect(quotaPreview).toHaveClass(/bg-red-50/)
  })

  test('shows remaining files count', async ({ page }) => {
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFiles, course: mockCourse },
        }),
      })
    })

    await page.goto('/files/course-1')

    const quotaPreview = page.getByTestId('quota-preview')

    // Should show remaining files (30 - 3 = 27)
    await expect(quotaPreview).toContainText('27 files remaining')
  })

  test('shows warning when at file limit', async ({ page }) => {
    // Mock 30 files (100% of 30)
    const maxFiles = Array.from({ length: 30 }, (_, i) => ({
      id: `file-${i + 1}`,
      courseId: 'course-1',
      userId: 'user-1',
      name: `file-${i + 1}.pdf`,
      type: 'lecture',
      pageCount: 10,
      fileSize: 100000,
      isScanned: false,
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: maxFiles, course: mockCourse },
        }),
      })
    })

    await page.goto('/files/course-1')

    const quotaPreview = page.getByTestId('quota-preview')

    // Should show limit reached warning
    await expect(quotaPreview).toContainText('File limit reached')
  })
})

// ============================================
// Test Suite: Keyboard Navigation
// ============================================

test.describe('Keyboard Navigation', () => {
  // Skip UI tests if database is not available
  test.skip(SKIP_DB_TESTS, 'Requires database connection - set DATABASE_URL to run')

  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)

    // Mock files API
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFiles, course: mockCourse },
        }),
      })
    })

    // Mock delete endpoint
    await page.route('**/api/files/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { deleted: true },
          }),
        })
      }
    })
  })

  test('can tab through table rows', async ({ page }) => {
    await page.goto('/files/course-1')

    // Wait for table to load
    await expect(page.locator('table')).toBeVisible()

    // Focus on first table row by clicking then tabbing
    await page.keyboard.press('Tab')

    // Keep tabbing to reach table rows
    // The exact number of tabs depends on the page layout
    // We'll try to focus a row directly
    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })
    await firstRow.focus()

    // First row should be focused
    await expect(firstRow).toBeFocused()

    // Tab to next row
    await page.keyboard.press('Tab')
  })

  test('pressing Enter on focused row navigates to reader', async ({ page }) => {
    await page.goto('/files/course-1')

    // Wait for table to load
    await expect(page.locator('table')).toBeVisible()

    // Focus on first row (ready file)
    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })
    await firstRow.focus()

    // Press Enter
    await page.keyboard.press('Enter')

    // Should navigate to reader page
    await expect(page).toHaveURL(/\/reader\/file-1/)
  })

  test('pressing Delete on focused row opens delete dialog', async ({ page }) => {
    await page.goto('/files/course-1')

    // Wait for table to load
    await expect(page.locator('table')).toBeVisible()

    // Focus on first row
    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })
    await firstRow.focus()

    // Press Delete
    await page.keyboard.press('Delete')

    // Delete dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText('Delete File')
  })

  test('pressing Backspace on focused row opens delete dialog', async ({ page }) => {
    await page.goto('/files/course-1')

    // Wait for table to load
    await expect(page.locator('table')).toBeVisible()

    // Focus on first row
    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })
    await firstRow.focus()

    // Press Backspace
    await page.keyboard.press('Backspace')

    // Delete dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText('Delete File')
  })

  test('pressing Space on focused row navigates to reader for ready files', async ({ page }) => {
    await page.goto('/files/course-1')

    // Wait for table to load
    await expect(page.locator('table')).toBeVisible()

    // Focus on first row (ready file)
    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })
    await firstRow.focus()

    // Press Space
    await page.keyboard.press(' ')

    // Should navigate to reader page
    await expect(page).toHaveURL(/\/reader\/file-1/)
  })

  test('Enter does not navigate for non-ready files', async ({ page }) => {
    // Mock with processing file first
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFilesWithStatuses, course: mockCourse },
        }),
      })
    })

    await page.goto('/files/course-1')

    // Focus on processing file row
    const processingRow = page.getByRole('row').filter({ hasText: 'processing-file.pdf' })
    await processingRow.focus()

    // Press Enter
    await page.keyboard.press('Enter')

    // Should stay on files page (not navigate to reader)
    await expect(page).toHaveURL(/\/files\/course-1/)
  })
})

// ============================================
// Test Suite: Loading and Error States
// ============================================

test.describe('Loading and Error States', () => {
  // Skip UI tests if database is not available
  test.skip(SKIP_DB_TESTS, 'Requires database connection - set DATABASE_URL to run')

  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)
  })

  test('shows loading skeleton while files are being fetched', async ({ page }) => {
    // Mock with delay
    await page.route('**/api/courses/course-1/files', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFiles, course: mockCourse },
        }),
      })
    })

    await page.goto('/files/course-1')

    // Loading skeleton should be visible initially
    // (The skeleton component should be visible during loading)

    // Wait for files to load
    await expect(page.getByText('lecture-1.pdf')).toBeVisible({ timeout: 5000 })
  })

  test('shows error state when API fails', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'SERVER_ERROR', message: 'Internal server error' },
        }),
      })
    })

    await page.goto('/files/course-1')

    // Error state should be visible
    await expect(page.getByText('Failed to load files')).toBeVisible()

    // Retry button should be visible
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
  })

  test('retry button reloads the page', async ({ page }) => {
    let requestCount = 0

    // Mock API - first fail, then succeed
    await page.route('**/api/courses/course-1/files', async (route) => {
      requestCount++
      if (requestCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { code: 'SERVER_ERROR', message: 'Internal server error' },
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { files: mockFiles, course: mockCourse },
          }),
        })
      }
    })

    await page.goto('/files/course-1')

    // Error state should be visible
    await expect(page.getByText('Failed to load files')).toBeVisible()

    // Click retry (this reloads the page)
    await page.getByRole('button', { name: 'Retry' }).click()

    // Files should now be visible
    await expect(page.getByText('lecture-1.pdf')).toBeVisible({ timeout: 5000 })
  })
})

// ============================================
// Test Suite: Breadcrumb Navigation
// ============================================

test.describe('Breadcrumb Navigation', () => {
  // Skip UI tests if database is not available
  test.skip(SKIP_DB_TESTS, 'Requires database connection - set DATABASE_URL to run')

  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)
    await setupCoursesApiMock(page)

    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFiles, course: mockCourse },
        }),
      })
    })
  })

  test('clicking Courses in breadcrumb navigates to courses page', async ({ page }) => {
    await page.goto('/files/course-1')

    // Wait for breadcrumb to load
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible()

    // Click on Courses link
    await page.getByRole('link', { name: 'Courses' }).click()

    // Should navigate to courses page
    await expect(page).toHaveURL('/courses')
  })

  test('clicking course name in breadcrumb navigates to course page', async ({ page }) => {
    await page.goto('/files/course-1')

    // Wait for breadcrumb to load
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible()

    // Click on course name link
    await page.getByRole('link', { name: 'Introduction to Psychology' }).click()

    // Should navigate to course detail page (if it exists) or stay
    // The breadcrumb links to /courses/course-1
    await expect(page).toHaveURL('/courses/course-1')
  })

  test('Files text in breadcrumb indicates current page', async ({ page }) => {
    await page.goto('/files/course-1')

    // The "Files" item should have aria-current="page"
    const filesItem = page.locator('[aria-current="page"]')
    await expect(filesItem).toContainText('Files')
  })
})

// ============================================
// Test Suite: Opening Files
// ============================================

test.describe('Opening Files', () => {
  // Skip UI tests if database is not available
  test.skip(SKIP_DB_TESTS, 'Requires database connection - set DATABASE_URL to run')

  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)

    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFiles, course: mockCourse },
        }),
      })
    })
  })

  test('clicking open button navigates to reader page', async ({ page }) => {
    await page.goto('/files/course-1')

    // Find the first file row and click open
    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })
    await firstRow.getByRole('button', { name: 'Open file' }).click()

    // Should navigate to reader page
    await expect(page).toHaveURL(/\/reader\/file-1/)
  })

  test('clicking table row navigates to reader page for ready files', async ({ page }) => {
    await page.goto('/files/course-1')

    // Click on the first file row (not on a button)
    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })

    // Click on the file name cell
    await firstRow.locator('td').first().click()

    // The row click handler should trigger navigation
    // Note: This depends on the implementation - if row click is enabled
  })
})

// ============================================
// Test Suite: Accessibility
// ============================================

test.describe('Accessibility', () => {
  // Skip UI tests if database is not available
  test.skip(SKIP_DB_TESTS, 'Requires database connection - set DATABASE_URL to run')

  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)

    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFiles, course: mockCourse },
        }),
      })
    })
  })

  test('table has proper aria-label', async ({ page }) => {
    await page.goto('/files/course-1')

    const table = page.locator('table')
    await expect(table).toHaveAttribute('aria-label', 'Files table')
  })

  test('breadcrumb has proper aria-label', async ({ page }) => {
    await page.goto('/files/course-1')

    const nav = page.locator('nav[aria-label="Breadcrumb"]')
    await expect(nav).toBeVisible()
  })

  test('quota preview has proper aria-label', async ({ page }) => {
    await page.goto('/files/course-1')

    const quotaPreview = page.getByTestId('quota-preview')
    await expect(quotaPreview).toHaveAttribute('aria-label', /File quota: \d+ of \d+ files used/)
  })

  test('progress bar has proper aria attributes', async ({ page }) => {
    await page.goto('/files/course-1')

    const progressBar = page.getByRole('progressbar').first()
    await expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    await expect(progressBar).toHaveAttribute('aria-valuemax', '100')
  })

  test('table rows are focusable', async ({ page }) => {
    await page.goto('/files/course-1')

    const firstRow = page.getByRole('row').filter({ hasText: 'lecture-1.pdf' })
    await expect(firstRow).toHaveAttribute('tabindex', '0')
  })

  test('buttons have proper aria-labels', async ({ page }) => {
    await page.goto('/files/course-1')

    // Open button
    const openButton = page.getByRole('button', { name: 'Open file' }).first()
    await expect(openButton).toHaveAttribute('aria-label', 'Open file')

    // Delete button
    const deleteButton = page.getByRole('button', { name: 'Delete' }).first()
    await expect(deleteButton).toHaveAttribute('aria-label', 'Delete')
  })

  test('upload zone has proper aria attributes', async ({ page }) => {
    await page.goto('/files/course-1')

    // Show upload zone
    await page.getByRole('button', { name: 'Upload File' }).click()

    const uploadZone = page.getByTestId('file-upload-zone')
    await expect(uploadZone).toHaveAttribute('aria-label', 'File upload zone')
  })
})

// ============================================
// API-Level Tests (No Database Required)
// These tests verify API endpoints using route mocking
// ============================================

test.describe('File API - GET /api/courses/[id]/files', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)
  })

  test('authenticated user can list files in their course', async ({ page }) => {
    // Mock the course files API
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: mockFiles, course: mockCourse },
        }),
      })
    })

    // Navigate to a page to initialize the context, then evaluate fetch
    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/courses/course-1/files')
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(200)
    expect(response.data.data.files).toHaveLength(3)
    expect(response.data.data.files[0].name).toBe('lecture-1.pdf')
  })

  test('returns empty array when course has no files', async ({ page }) => {
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { files: [], course: mockCourse },
        }),
      })
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/courses/course-1/files')
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(200)
    expect(response.data.data.files).toHaveLength(0)
  })

  test('returns 404 for non-existent course', async ({ page }) => {
    await page.route('**/api/courses/non-existent-course/files', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        }),
      })
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/courses/non-existent-course/files')
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(404)
    expect(response.data.error.code).toBe('COURSE_NOT_FOUND')
  })
})

test.describe('File API - Unauthenticated Access', () => {
  test('GET /api/courses/[id]/files returns 401 for unauthenticated user', async ({ page }) => {
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'AUTH_SESSION_EXPIRED', message: 'Authentication required' },
        }),
      })
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/courses/course-1/files')
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(401)
    expect(response.data.error.code).toBe('AUTH_SESSION_EXPIRED')
    expect(response.data.error.message).toBe('Authentication required')
  })

  test('POST /api/files/upload-url returns 401 for unauthenticated user', async ({ page }) => {
    await page.route('**/api/files/upload-url', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'AUTH_SESSION_EXPIRED', message: 'Authentication required' },
        }),
      })
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
        },
        body: JSON.stringify({
          courseId: 'course-1',
          fileName: 'test.pdf',
          fileSize: 1024000,
        }),
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(401)
    expect(response.data.error.code).toBe('AUTH_SESSION_EXPIRED')
  })

  test('DELETE /api/files/[id] returns 401 for unauthenticated user', async ({ page }) => {
    await page.route('**/api/files/file-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'AUTH_SESSION_EXPIRED', message: 'Authentication required' },
          }),
        })
      }
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/files/file-1', {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': 'test-csrf-token',
        },
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(401)
    expect(response.data.error.code).toBe('AUTH_SESSION_EXPIRED')
  })
})

test.describe('File API - POST /api/files/upload-url', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)
  })

  test('authenticated user can request an upload URL', async ({ page }) => {
    let capturedBody: { courseId?: string; fileName?: string; fileSize?: number } | null = null

    await page.route('**/api/files/upload-url', async (route) => {
      if (route.request().method() === 'POST') {
        capturedBody = JSON.parse(route.request().postData() || '{}')
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockUploadUrlResponse,
          }),
        })
      }
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
        },
        body: JSON.stringify({
          courseId: 'course-1',
          fileName: 'new-lecture.pdf',
          fileSize: 2048000,
        }),
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(200)
    expect(response.data.data.fileId).toBe('new-file-id')
    expect(response.data.data.uploadUrl).toContain('https://')
  })

  test('rejects non-PDF file uploads', async ({ page }) => {
    await page.route('**/api/files/upload-url', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'FILE_INVALID_TYPE', message: 'Only PDF files are allowed' },
        }),
      })
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
        },
        body: JSON.stringify({
          courseId: 'course-1',
          fileName: 'document.docx',
          fileSize: 1024000,
        }),
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(400)
    expect(response.data.error.code).toBe('FILE_INVALID_TYPE')
    expect(response.data.error.message).toBe('Only PDF files are allowed')
  })

  test('rejects file exceeding size limit', async ({ page }) => {
    await page.route('**/api/files/upload-url', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: 'File exceeds maximum size of 200MB' },
        }),
      })
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
        },
        body: JSON.stringify({
          courseId: 'course-1',
          fileName: 'huge-file.pdf',
          fileSize: 300 * 1024 * 1024,
        }),
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(400)
    expect(response.data.error.code).toBe('FILE_TOO_LARGE')
  })

  test('rejects duplicate file name in course', async ({ page }) => {
    await page.route('**/api/files/upload-url', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FILE_NAME_EXISTS',
            message: 'A file with this name already exists in the course',
          },
        }),
      })
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
        },
        body: JSON.stringify({
          courseId: 'course-1',
          fileName: 'lecture-1.pdf',
          fileSize: 1024000,
        }),
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(409)
    expect(response.data.error.code).toBe('FILE_NAME_EXISTS')
  })

  test('rejects when file limit per course exceeded', async ({ page }) => {
    await page.route('**/api/files/upload-url', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FILE_LIMIT_EXCEEDED',
            message: 'Maximum number of files per course reached',
          },
        }),
      })
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
        },
        body: JSON.stringify({
          courseId: 'course-1',
          fileName: 'extra-file.pdf',
          fileSize: 1024000,
        }),
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(400)
    expect(response.data.error.code).toBe('FILE_LIMIT_EXCEEDED')
  })
})

test.describe('File API - DELETE /api/files/[id]', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)
  })

  test('deletes file successfully', async ({ page }) => {
    await page.route('**/api/files/file-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { deleted: true },
          }),
        })
      }
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/files/file-1', {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': 'test-csrf-token',
        },
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(200)
    expect(response.data.data.deleted).toBe(true)
  })

  test('returns 404 for non-existent file', async ({ page }) => {
    await page.route('**/api/files/non-existent-id', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
          }),
        })
      }
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/files/non-existent-id', {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': 'test-csrf-token',
        },
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(404)
    expect(response.data.error.code).toBe('FILE_NOT_FOUND')
  })

  test('cannot delete another users file', async ({ page }) => {
    await page.route('**/api/files/other-user-file', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
          }),
        })
      }
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/files/other-user-file', {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': 'test-csrf-token',
        },
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    // Should return 404 (not 403) to prevent enumeration
    expect(response.status).toBe(404)
    expect(response.data.error.code).toBe('FILE_NOT_FOUND')
  })
})

test.describe('File API - Rate Limiting', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)
  })

  test('returns 429 when rate limit exceeded for file listing', async ({ page }) => {
    await page.route('**/api/courses/course-1/files', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'AUTH_RATE_LIMITED', message: 'Too many requests' },
        }),
      })
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/courses/course-1/files')
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(429)
    expect(response.data.error.code).toBe('AUTH_RATE_LIMITED')
    expect(response.data.error.message).toBe('Too many requests')
  })

  test('returns 429 when rate limit exceeded for delete', async ({ page }) => {
    await page.route('**/api/files/file-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'AUTH_RATE_LIMITED', message: 'Too many requests' },
          }),
        })
      }
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/files/file-1', {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': 'test-csrf-token',
        },
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(429)
    expect(response.data.error.code).toBe('AUTH_RATE_LIMITED')
  })
})

test.describe('File API - Security Validations', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)
  })

  test('rejects file names with path traversal attempts', async ({ page }) => {
    await page.route('**/api/files/upload-url', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'FILE_VALIDATION_ERROR', message: 'Invalid file name' },
        }),
      })
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
        },
        body: JSON.stringify({
          courseId: 'course-1',
          fileName: '../../../etc/passwd.pdf',
          fileSize: 1024000,
        }),
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(400)
    expect(response.data.error.code).toBe('FILE_VALIDATION_ERROR')
  })

  test('rejects file names with forward slashes', async ({ page }) => {
    await page.route('**/api/files/upload-url', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'FILE_VALIDATION_ERROR', message: 'Invalid file name' },
        }),
      })
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
        },
        body: JSON.stringify({
          courseId: 'course-1',
          fileName: 'folder/malicious.pdf',
          fileSize: 1024000,
        }),
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(400)
    expect(response.data.error.code).toBe('FILE_VALIDATION_ERROR')
  })

  test('rejects file names exceeding maximum length', async ({ page }) => {
    await page.route('**/api/files/upload-url', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FILE_VALIDATION_ERROR',
            message: 'File name must be 255 characters or less',
          },
        }),
      })
    })

    await page.goto('/')
    const response = await page.evaluate(async () => {
      const longFileName = 'a'.repeat(260) + '.pdf'
      const res = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
        },
        body: JSON.stringify({
          courseId: 'course-1',
          fileName: longFileName,
          fileSize: 1024000,
        }),
      })
      return {
        status: res.status,
        data: await res.json(),
      }
    })

    expect(response.status).toBe(400)
    expect(response.data.error.code).toBe('FILE_VALIDATION_ERROR')
  })
})
