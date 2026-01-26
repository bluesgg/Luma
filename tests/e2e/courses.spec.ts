import { test, expect } from '@playwright/test'

/**
 * E2E Tests for the Course List Page
 *
 * These tests run against the actual application in a real browser
 * to verify the complete course management user journeys.
 *
 * Note: Tests mock Supabase auth API to simulate authenticated state
 * since the /courses page requires authentication (protected route).
 * The middleware checks auth via Supabase's getUser() which makes
 * a request to the Supabase auth API.
 */

// Mock course data for testing
const mockCourses = [
  {
    id: 'course-1',
    userId: 'user-1',
    name: 'Introduction to Psychology',
    school: 'Harvard University',
    term: 'Fall 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    _count: { files: 3 },
  },
  {
    id: 'course-2',
    userId: 'user-1',
    name: 'Calculus I',
    school: 'MIT',
    term: 'Spring 2025',
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    _count: { files: 5 },
  },
  {
    id: 'course-3',
    userId: 'user-1',
    name: 'Data Structures',
    school: null,
    term: null,
    createdAt: '2025-01-03T00:00:00.000Z',
    updatedAt: '2025-01-03T00:00:00.000Z',
    _count: { files: 0 },
  },
]

// Mock six courses to test limit reached state
const mockSixCourses = Array.from({ length: 6 }, (_, i) => ({
  id: `course-${i + 1}`,
  userId: 'user-1',
  name: `Course ${i + 1}`,
  school: 'Test University',
  term: 'Fall 2025',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  _count: { files: i },
}))

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

test.describe('Course List Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase auth API to simulate logged-in state
    // This intercepts the getUser() call made by the middleware
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser),
      })
    })

    // Mock Supabase session token endpoint
    await page.route('**/auth/v1/token*', async (route) => {
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
    await page.route('**/api/csrf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'test-csrf-token' }),
      })
    })

    // Mock auth check to simulate logged-in state (client-side)
    await page.route('**/api/auth/me', async (route) => {
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
  })

  test.describe('Page Rendering with Courses', () => {
    test.beforeEach(async ({ page }) => {
      // Mock courses API to return test courses
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: mockCourses },
            }),
          })
        } else {
          await route.continue()
        }
      })
    })

    test('displays page header with title and course count', async ({ page }) => {
      await page.goto('/courses')

      // Check page title
      await expect(page.locator('h1')).toContainText('My Courses')

      // Check course count shows correctly
      const courseCount = page.getByTestId('course-count')
      await expect(courseCount).toBeVisible()
      await expect(courseCount).toContainText('3 of 6 courses')
    })

    test('displays course cards in a responsive grid', async ({ page }) => {
      await page.goto('/courses')

      // Wait for courses to load
      await expect(page.getByTestId('courses-content')).toBeVisible()

      // Check all course cards are displayed
      const courseCards = page.getByTestId('course-card')
      await expect(courseCards).toHaveCount(3)
    })

    test('displays course details on cards', async ({ page }) => {
      await page.goto('/courses')

      // Check first course card displays correct info
      const firstCard = page.getByTestId('course-card').first()
      await expect(firstCard.getByTestId('course-name')).toContainText('Introduction to Psychology')
      await expect(firstCard.getByTestId('course-school')).toContainText('Harvard University')
      await expect(firstCard.getByTestId('course-term')).toContainText('Fall 2025')
      await expect(firstCard.getByTestId('course-file-count')).toContainText('3 files')
    })

    test('displays create course button enabled when under limit', async ({ page }) => {
      await page.goto('/courses')

      const createButton = page.getByTestId('create-course-button')
      await expect(createButton).toBeVisible()
      await expect(createButton).not.toBeDisabled()
      await expect(createButton).toContainText('Create Course')
    })

    test('displays singular "file" text when count is 1', async ({ page }) => {
      // Mock with a course that has exactly 1 file
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                courses: [{ ...mockCourses[0], _count: { files: 1 } }],
              },
            }),
          })
        }
      })

      await page.goto('/courses')

      const fileCount = page.getByTestId('course-file-count').first()
      await expect(fileCount).toContainText('1 file')
    })
  })

  test.describe('Empty State', () => {
    test.beforeEach(async ({ page }) => {
      // Mock courses API to return empty array
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: [] },
            }),
          })
        } else {
          await route.continue()
        }
      })
    })

    test('displays empty state when no courses exist', async ({ page }) => {
      await page.goto('/courses')

      // Check empty state is visible
      const emptyState = page.getByTestId('empty-courses')
      await expect(emptyState).toBeVisible()
      await expect(emptyState).toContainText('No courses yet')
      await expect(emptyState).toContainText(
        'Create your first course to start organizing your PDF learning materials'
      )
    })

    test('displays create button in empty state', async ({ page }) => {
      await page.goto('/courses')

      const emptyCreateButton = page.getByTestId('empty-create-button')
      await expect(emptyCreateButton).toBeVisible()
      await expect(emptyCreateButton).toContainText('Create Course')
    })

    test('clicking empty state create button opens dialog', async ({ page }) => {
      await page.goto('/courses')

      // Click the create button in empty state
      await page.getByTestId('empty-create-button').click()

      // Dialog should open
      const dialog = page.getByTestId('create-course-dialog')
      await expect(dialog).toBeVisible()
    })

    test('shows 0 of 6 courses in header', async ({ page }) => {
      await page.goto('/courses')

      const courseCount = page.getByTestId('course-count')
      await expect(courseCount).toContainText('0 of 6 courses')
    })
  })

  test.describe('Course Limit Reached', () => {
    test.beforeEach(async ({ page }) => {
      // Mock courses API to return 6 courses (limit reached)
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: mockSixCourses },
            }),
          })
        } else {
          await route.continue()
        }
      })
    })

    test('disables create button when course limit reached', async ({ page }) => {
      await page.goto('/courses')

      const createButton = page.getByTestId('create-course-button')
      await expect(createButton).toBeDisabled()
      await expect(createButton).toHaveAttribute('title', 'Course limit reached')
    })

    test('shows 6 of 6 courses in header', async ({ page }) => {
      await page.goto('/courses')

      const courseCount = page.getByTestId('course-count')
      await expect(courseCount).toContainText('6 of 6 courses')
    })

    test('displays all 6 course cards', async ({ page }) => {
      await page.goto('/courses')

      const courseCards = page.getByTestId('course-card')
      await expect(courseCards).toHaveCount(6)
    })
  })

  test.describe('Create Course Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Mock courses API for initial load
      await page.route('**/api/courses', async (route) => {
        const method = route.request().method()

        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: mockCourses },
            }),
          })
        } else if (method === 'POST') {
          const body = JSON.parse(route.request().postData() || '{}')
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                course: {
                  id: 'new-course-id',
                  userId: 'user-1',
                  name: body.name,
                  school: body.school || null,
                  term: body.term || null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  _count: { files: 0 },
                },
              },
            }),
          })
        }
      })
    })

    test('opens create course dialog when clicking create button', async ({ page }) => {
      await page.goto('/courses')

      // Click create button
      await page.getByTestId('create-course-button').click()

      // Dialog should open
      const dialog = page.getByTestId('create-course-dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText('Create New Course')
      await expect(dialog).toContainText('Add a new course to organize your learning materials')
    })

    test('displays form fields in create dialog', async ({ page }) => {
      await page.goto('/courses')
      await page.getByTestId('create-course-button').click()

      // Check form fields are visible
      await expect(page.getByTestId('course-name-input')).toBeVisible()
      await expect(page.getByTestId('course-school-input')).toBeVisible()
      await expect(page.getByTestId('course-term-input')).toBeVisible()
      await expect(page.getByTestId('create-course-submit')).toBeVisible()
    })

    test('successfully creates a course with all fields', async ({ page }) => {
      await page.goto('/courses')
      await page.getByTestId('create-course-button').click()

      // Fill in the form
      await page.getByTestId('course-name-input').fill('New Test Course')
      await page.getByTestId('course-school-input').fill('Test University')
      await page.getByTestId('course-term-input').fill('Winter 2025')

      // Submit the form
      await page.getByTestId('create-course-submit').click()

      // Dialog should close
      await expect(page.getByTestId('create-course-dialog')).not.toBeVisible()

      // Success toast should appear
      await expect(page.getByText('Course created')).toBeVisible()
      await expect(page.getByText('"New Test Course" has been created successfully')).toBeVisible()
    })

    test('successfully creates a course with only name', async ({ page }) => {
      await page.goto('/courses')
      await page.getByTestId('create-course-button').click()

      // Fill in only the name
      await page.getByTestId('course-name-input').fill('Minimal Course')

      // Submit the form
      await page.getByTestId('create-course-submit').click()

      // Dialog should close
      await expect(page.getByTestId('create-course-dialog')).not.toBeVisible()

      // Success toast should appear
      await expect(page.getByText('Course created')).toBeVisible()
    })

    test('can close create dialog with cancel button', async ({ page }) => {
      await page.goto('/courses')
      await page.getByTestId('create-course-button').click()

      // Fill in some data
      await page.getByTestId('course-name-input').fill('Test Course')

      // Click cancel
      await page.getByRole('button', { name: 'Cancel' }).click()

      // Dialog should close
      await expect(page.getByTestId('create-course-dialog')).not.toBeVisible()
    })

    test('form is cleared when reopening create dialog after cancel', async ({ page }) => {
      await page.goto('/courses')

      // Open dialog and fill in data
      await page.getByTestId('create-course-button').click()
      await page.getByTestId('course-name-input').fill('Test Course')

      // Cancel
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByTestId('create-course-dialog')).not.toBeVisible()

      // Reopen dialog
      await page.getByTestId('create-course-button').click()

      // Form should be cleared
      await expect(page.getByTestId('course-name-input')).toHaveValue('')
      await expect(page.getByTestId('course-school-input')).toHaveValue('')
      await expect(page.getByTestId('course-term-input')).toHaveValue('')
    })
  })

  test.describe('Create Course Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: mockCourses },
            }),
          })
        }
      })
    })

    test('shows validation error for empty course name', async ({ page }) => {
      await page.goto('/courses')
      await page.getByTestId('create-course-button').click()

      // Submit without filling name
      await page.getByTestId('create-course-submit').click()

      // Should show validation error
      await expect(page.getByText('Course name is required')).toBeVisible()
    })

    test('shows validation error for course name exceeding 50 characters', async ({ page }) => {
      await page.goto('/courses')
      await page.getByTestId('create-course-button').click()

      // Fill in a very long name (51 characters)
      const longName = 'A'.repeat(51)
      await page.getByTestId('course-name-input').fill(longName)
      await page.getByTestId('create-course-submit').click()

      // Should show validation error
      await expect(page.getByText('Course name must be 50 characters or less')).toBeVisible()
    })

    test('accepts course name at exactly 50 characters', async ({ page }) => {
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                course: {
                  id: 'new-id',
                  userId: 'user-1',
                  name: 'A'.repeat(50),
                  school: null,
                  term: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  _count: { files: 0 },
                },
              },
            }),
          })
        }
      })

      await page.goto('/courses')
      await page.getByTestId('create-course-button').click()

      // Fill in name at exactly 50 characters
      const exactName = 'A'.repeat(50)
      await page.getByTestId('course-name-input').fill(exactName)
      await page.getByTestId('create-course-submit').click()

      // Should succeed
      await expect(page.getByTestId('create-course-dialog')).not.toBeVisible()
      await expect(page.getByText('Course created')).toBeVisible()
    })

    test('shows validation error for school name exceeding 100 characters', async ({ page }) => {
      await page.goto('/courses')
      await page.getByTestId('create-course-button').click()

      // Fill in valid name but too long school
      await page.getByTestId('course-name-input').fill('Valid Name')
      await page.getByTestId('course-school-input').fill('A'.repeat(101))
      await page.getByTestId('create-course-submit').click()

      // Should show validation error
      await expect(page.getByText('School name must be 100 characters or less')).toBeVisible()
    })

    test('shows validation error for term exceeding 50 characters', async ({ page }) => {
      await page.goto('/courses')
      await page.getByTestId('create-course-button').click()

      // Fill in valid name but too long term
      await page.getByTestId('course-name-input').fill('Valid Name')
      await page.getByTestId('course-term-input').fill('A'.repeat(51))
      await page.getByTestId('create-course-submit').click()

      // Should show validation error
      await expect(page.getByText('Term must be 50 characters or less')).toBeVisible()
    })
  })

  test.describe('Edit Course Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: mockCourses },
            }),
          })
        }
      })

      // Mock PATCH for updating a course
      await page.route('**/api/courses/*', async (route) => {
        if (route.request().method() === 'PATCH') {
          const body = JSON.parse(route.request().postData() || '{}')
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                course: {
                  ...mockCourses[0],
                  name: body.name || mockCourses[0].name,
                  school: body.school ?? mockCourses[0].school,
                  term: body.term ?? mockCourses[0].term,
                },
              },
            }),
          })
        }
      })
    })

    test('opens edit dialog via dropdown menu', async ({ page }) => {
      await page.goto('/courses')

      // Hover over first course card to show menu button
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()

      // Click the menu button
      await firstCard.getByTestId('course-menu-button').click()

      // Click edit option
      await page.getByTestId('edit-course-button').click()

      // Edit dialog should open
      const dialog = page.getByTestId('edit-course-dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText('Edit Course')
    })

    test('pre-fills form with existing course data', async ({ page }) => {
      await page.goto('/courses')

      // Open edit dialog for first course
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('edit-course-button').click()

      // Check form is pre-filled
      await expect(page.getByTestId('edit-course-name-input')).toHaveValue(
        'Introduction to Psychology'
      )
      await expect(page.getByTestId('edit-course-school-input')).toHaveValue('Harvard University')
      await expect(page.getByTestId('edit-course-term-input')).toHaveValue('Fall 2025')
    })

    test('successfully edits a course', async ({ page }) => {
      await page.goto('/courses')

      // Open edit dialog
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('edit-course-button').click()

      // Modify the course name
      await page.getByTestId('edit-course-name-input').clear()
      await page.getByTestId('edit-course-name-input').fill('Updated Psychology Course')

      // Submit
      await page.getByTestId('edit-course-submit').click()

      // Dialog should close
      await expect(page.getByTestId('edit-course-dialog')).not.toBeVisible()

      // Success toast should appear
      await expect(page.getByText('Course updated')).toBeVisible()
      await expect(page.getByText('Your changes have been saved')).toBeVisible()
    })

    test('can cancel edit without saving changes', async ({ page }) => {
      await page.goto('/courses')

      // Open edit dialog
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('edit-course-button').click()

      // Modify the name
      await page.getByTestId('edit-course-name-input').clear()
      await page.getByTestId('edit-course-name-input').fill('Should Not Save')

      // Cancel
      await page.getByRole('button', { name: 'Cancel' }).click()

      // Dialog should close
      await expect(page.getByTestId('edit-course-dialog')).not.toBeVisible()

      // Original name should still be visible
      await expect(firstCard.getByTestId('course-name')).toContainText(
        'Introduction to Psychology'
      )
    })
  })

  test.describe('Delete Course Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: mockCourses },
            }),
          })
        }
      })

      // Mock DELETE for deleting a course
      await page.route('**/api/courses/*', async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { success: true } }),
          })
        }
      })
    })

    test('opens delete confirmation dialog via dropdown menu', async ({ page }) => {
      await page.goto('/courses')

      // Hover over first course card to show menu button
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()

      // Click the menu button
      await firstCard.getByTestId('course-menu-button').click()

      // Click delete option
      await page.getByTestId('delete-course-button').click()

      // Delete dialog should open
      const dialog = page.getByTestId('delete-course-dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText('Delete Course')
      await expect(dialog).toContainText('Introduction to Psychology')
      await expect(dialog).toContainText('This action cannot be undone')
    })

    test('delete button is disabled until user types exact course name', async ({ page }) => {
      await page.goto('/courses')

      // Open delete dialog for first course
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('delete-course-button').click()

      // Delete button should be disabled initially
      const deleteButton = page.getByTestId('confirm-delete-button')
      await expect(deleteButton).toBeDisabled()

      // Type partial course name - button should still be disabled
      const confirmInput = page.getByTestId('confirmation-input')
      await confirmInput.fill('Introduction')
      await expect(deleteButton).toBeDisabled()

      // Type wrong case - button should still be disabled (case-sensitive)
      await confirmInput.fill('introduction to psychology')
      await expect(deleteButton).toBeDisabled()

      // Type exact course name - button should be enabled
      await confirmInput.fill('Introduction to Psychology')
      await expect(deleteButton).not.toBeDisabled()
    })

    test('file count warning appears when course has files', async ({ page }) => {
      await page.goto('/courses')

      // First course has 3 files according to mockCourses
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('delete-course-button').click()

      // File count warning should be visible
      const fileWarning = page.getByTestId('file-count-warning')
      await expect(fileWarning).toBeVisible()
      await expect(fileWarning).toContainText('3 files')
      await expect(fileWarning).toContainText('permanently deleted')
    })

    test('file count warning shows singular "file" when count is 1', async ({ page }) => {
      // Mock courses API with a course that has exactly 1 file
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                courses: [{ ...mockCourses[0], _count: { files: 1 } }],
              },
            }),
          })
        }
      })

      await page.goto('/courses')

      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('delete-course-button').click()

      // File count warning should show singular "file"
      const fileWarning = page.getByTestId('file-count-warning')
      await expect(fileWarning).toBeVisible()
      await expect(fileWarning).toContainText('1 file')
    })

    test('file count warning does not appear when course has no files', async ({ page }) => {
      await page.goto('/courses')

      // Third course (Data Structures) has 0 files according to mockCourses
      const thirdCard = page.getByTestId('course-card').nth(2)
      await thirdCard.hover()
      await thirdCard.getByTestId('course-menu-button').click()
      await page.getByTestId('delete-course-button').click()

      // File count warning should NOT be visible
      const fileWarning = page.getByTestId('file-count-warning')
      await expect(fileWarning).not.toBeVisible()
    })

    test('successfully deletes a course after typing confirmation', async ({ page }) => {
      await page.goto('/courses')

      // Open delete dialog
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('delete-course-button').click()

      // Type exact course name to enable delete button
      const confirmInput = page.getByTestId('confirmation-input')
      await confirmInput.fill('Introduction to Psychology')

      // Confirm deletion
      await page.getByTestId('confirm-delete-button').click()

      // Dialog should close
      await expect(page.getByTestId('delete-course-dialog')).not.toBeVisible()

      // Success toast should appear (use exact match to avoid strict mode violation)
      await expect(page.getByText('Course deleted', { exact: true })).toBeVisible()
      // Toast description includes period, use exact match
      await expect(
        page.getByText('"Introduction to Psychology" has been deleted.', { exact: true })
      ).toBeVisible()
    })

    test('confirmation input is cleared when dialog is reopened', async ({ page }) => {
      await page.goto('/courses')

      // Open delete dialog
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('delete-course-button').click()

      // Type something in confirmation input
      const confirmInput = page.getByTestId('confirmation-input')
      await confirmInput.fill('Introduction to Psychology')

      // Cancel
      await page.getByTestId('cancel-button').click()
      await expect(page.getByTestId('delete-course-dialog')).not.toBeVisible()

      // Reopen dialog
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('delete-course-button').click()

      // Confirmation input should be cleared
      await expect(confirmInput).toHaveValue('')
      // Delete button should be disabled again
      await expect(page.getByTestId('confirm-delete-button')).toBeDisabled()
    })

    test('can delete course by pressing Enter after typing confirmation', async ({ page }) => {
      await page.goto('/courses')

      // Open delete dialog
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('delete-course-button').click()

      // Type exact course name
      const confirmInput = page.getByTestId('confirmation-input')
      await confirmInput.fill('Introduction to Psychology')

      // Press Enter to confirm
      await confirmInput.press('Enter')

      // Dialog should close
      await expect(page.getByTestId('delete-course-dialog')).not.toBeVisible()

      // Success toast should appear (use exact match to avoid strict mode violation)
      await expect(page.getByText('Course deleted', { exact: true })).toBeVisible()
    })

    test('cannot delete by pressing Enter with invalid confirmation', async ({ page }) => {
      await page.goto('/courses')

      // Open delete dialog
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('delete-course-button').click()

      // Type incorrect course name
      const confirmInput = page.getByTestId('confirmation-input')
      await confirmInput.fill('Wrong Name')

      // Press Enter - should not close dialog
      await confirmInput.press('Enter')

      // Dialog should still be visible
      await expect(page.getByTestId('delete-course-dialog')).toBeVisible()
    })

    test('can cancel delete without removing course', async ({ page }) => {
      await page.goto('/courses')

      // Open delete dialog
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('delete-course-button').click()

      // Cancel
      await page.getByTestId('cancel-button').click()

      // Dialog should close
      await expect(page.getByTestId('delete-course-dialog')).not.toBeVisible()

      // Course should still be visible
      await expect(firstCard.getByTestId('course-name')).toContainText(
        'Introduction to Psychology'
      )
    })
  })

  test.describe('Navigation to Course Files', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: mockCourses },
            }),
          })
        }
      })
    })

    test('clicking a course card navigates to files page', async ({ page }) => {
      await page.goto('/courses')

      // Click on first course card
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.click()

      // Should navigate to the files page for that course
      await expect(page).toHaveURL('/files/course-1')
    })

    test('pressing Enter on focused course card navigates to files page', async ({ page }) => {
      await page.goto('/courses')

      // Focus on first course card
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.focus()

      // Press Enter
      await page.keyboard.press('Enter')

      // Should navigate to the files page
      await expect(page).toHaveURL('/files/course-1')
    })

    test('pressing Space on focused course card navigates to files page', async ({ page }) => {
      await page.goto('/courses')

      // Focus on first course card
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.focus()

      // Press Space
      await page.keyboard.press(' ')

      // Should navigate to the files page
      await expect(page).toHaveURL('/files/course-1')
    })
  })

  test.describe('Error Handling', () => {
    test('displays error state when API fails', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { code: 'SERVER_ERROR', message: 'Internal server error' },
            }),
          })
        }
      })

      await page.goto('/courses')

      // Error state should be visible
      const errorState = page.getByTestId('courses-error')
      await expect(errorState).toBeVisible()
      await expect(errorState).toContainText('Failed to load courses')

      // Try again button should be visible
      await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible()
    })

    test('shows error toast when create course fails', async ({ page }) => {
      await page.route('**/api/courses', async (route) => {
        const method = route.request().method()
        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: mockCourses },
            }),
          })
        } else if (method === 'POST') {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { code: 'COURSE_LIMIT_EXCEEDED', message: 'Course limit exceeded' },
            }),
          })
        }
      })

      await page.goto('/courses')
      await page.getByTestId('create-course-button').click()
      await page.getByTestId('course-name-input').fill('Test Course')
      await page.getByTestId('create-course-submit').click()

      // Error toast should appear
      await expect(page.getByText('Failed to create course')).toBeVisible()
      await expect(page.getByText('Course limit exceeded')).toBeVisible()
    })

    test('shows error toast when edit course fails', async ({ page }) => {
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: mockCourses },
            }),
          })
        }
      })

      await page.route('**/api/courses/*', async (route) => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { code: 'VALIDATION_ERROR', message: 'Invalid course data' },
            }),
          })
        }
      })

      await page.goto('/courses')

      // Open edit dialog
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('edit-course-button').click()

      // Submit edit
      await page.getByTestId('edit-course-submit').click()

      // Error toast should appear
      await expect(page.getByText('Failed to update course')).toBeVisible()
      await expect(page.getByText('Invalid course data')).toBeVisible()
    })

    test('shows error toast when delete course fails', async ({ page }) => {
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: mockCourses },
            }),
          })
        }
      })

      await page.route('**/api/courses/*', async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { code: 'SERVER_ERROR', message: 'Failed to delete course' },
            }),
          })
        }
      })

      await page.goto('/courses')

      // Open delete dialog
      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()
      await firstCard.getByTestId('course-menu-button').click()
      await page.getByTestId('delete-course-button').click()

      // Confirm deletion
      await page.getByTestId('confirm-delete-button').click()

      // Error toast should appear
      await expect(page.getByText('Failed to delete course')).toBeVisible()
    })
  })

  test.describe('Loading State', () => {
    test('shows loading skeleton while courses are being fetched', async ({ page }) => {
      // Mock API with delay
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: mockCourses },
            }),
          })
        }
      })

      await page.goto('/courses')

      // Create button should be disabled during loading
      const createButton = page.getByTestId('create-course-button')
      await expect(createButton).toBeDisabled()

      // Wait for courses to load
      await expect(page.getByTestId('course-card').first()).toBeVisible({ timeout: 5000 })

      // Create button should be enabled after loading
      await expect(createButton).not.toBeDisabled()
    })

    test('shows loading state in create dialog during submission', async ({ page }) => {
      await page.route('**/api/courses', async (route) => {
        const method = route.request().method()
        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: mockCourses },
            }),
          })
        } else if (method === 'POST') {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                course: {
                  id: 'new-id',
                  userId: 'user-1',
                  name: 'Test',
                  school: null,
                  term: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  _count: { files: 0 },
                },
              },
            }),
          })
        }
      })

      await page.goto('/courses')
      await page.getByTestId('create-course-button').click()
      await page.getByTestId('course-name-input').fill('Test Course')
      await page.getByTestId('create-course-submit').click()

      // Button should show loading state
      const submitButton = page.getByTestId('create-course-submit')
      await expect(submitButton).toBeDisabled()

      // Should have loading spinner
      const loadingSpinner = page.getByTestId('create-course-dialog').locator('svg.animate-spin')
      await expect(loadingSpinner).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/courses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { courses: mockCourses },
            }),
          })
        }
      })
    })

    test('course cards have proper aria labels', async ({ page }) => {
      await page.goto('/courses')

      const firstCard = page.getByTestId('course-card').first()
      await expect(firstCard).toHaveAttribute('aria-label', 'Open course Introduction to Psychology')
    })

    test('course cards are focusable and have proper role', async ({ page }) => {
      await page.goto('/courses')

      const firstCard = page.getByTestId('course-card').first()
      await expect(firstCard).toHaveAttribute('role', 'button')
      await expect(firstCard).toHaveAttribute('tabindex', '0')
    })

    test('menu button has proper aria label', async ({ page }) => {
      await page.goto('/courses')

      const firstCard = page.getByTestId('course-card').first()
      await firstCard.hover()

      const menuButton = firstCard.getByTestId('course-menu-button')
      await expect(menuButton).toHaveAttribute('aria-label', 'Course options')
    })

    test('can navigate through course cards with keyboard', async ({ page }) => {
      await page.goto('/courses')

      // Tab to first course card
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab') // First tab goes to create button

      const firstCard = page.getByTestId('course-card').first()
      await expect(firstCard).toBeFocused()

      // Tab to next course card
      await page.keyboard.press('Tab')

      const secondCard = page.getByTestId('course-card').nth(1)
      await expect(secondCard).toBeFocused()
    })
  })
})
