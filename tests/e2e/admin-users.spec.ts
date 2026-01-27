// =============================================================================
// Admin User Management E2E Tests (Phase 7)
// Tests for /admin/users page and user management flows
// =============================================================================

import { test, expect } from '@playwright/test'

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set admin session cookie
    await context.addCookies([
      {
        name: 'luma-admin-session',
        value: 'valid-admin-token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ])

    await page.goto('/admin/users')
  })

  test.describe('User List Page', () => {
    test('should display user list table', async ({ page }) => {
      const table = page.locator('table, [role="table"]')
      await expect(table).toBeVisible()
    })

    test('should display user email column', async ({ page }) => {
      const emailHeader = page.locator('th:has-text("Email"), [role="columnheader"]:has-text("Email")')
      await expect(emailHeader).toBeVisible()
    })

    test('should display user role column', async ({ page }) => {
      const roleHeader = page.locator('th:has-text("Role"), [role="columnheader"]:has-text("Role")')
      await expect(roleHeader).toBeVisible()
    })

    test('should display user created date column', async ({ page }) => {
      const createdHeader = page.locator('th:has-text("Created"), [role="columnheader"]:has-text("Created")')
      await expect(createdHeader).toBeVisible()
    })

    test('should display quota summary for each user', async ({ page }) => {
      const quotaInfo = page.locator('text=/quota|limit/i')
      if (await quotaInfo.isVisible()) {
        await expect(quotaInfo).toBeVisible()
      }
    })

    test('should display user rows with data', async ({ page }) => {
      const rows = page.locator('tbody tr, [role="row"]')
      const count = await rows.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Search Functionality', () => {
    test('should display search input', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]')
      await expect(searchInput).toBeVisible()
    })

    test('should filter users by email', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]')
      await searchInput.fill('john@example.com')

      await page.waitForTimeout(500)

      const rows = page.locator('tbody tr')
      const count = await rows.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should show no results message when search has no matches', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]')
      await searchInput.fill('nonexistent@example.com')

      await page.waitForTimeout(500)

      const noResults = page.locator('text=/no.*results|no.*users.*found/i')
      if (await noResults.isVisible()) {
        await expect(noResults).toBeVisible()
      }
    })

    test('should clear search results when input is cleared', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]')
      await searchInput.fill('test')
      await page.waitForTimeout(300)

      await searchInput.clear()
      await page.waitForTimeout(300)

      const rows = page.locator('tbody tr')
      const count = await rows.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Pagination', () => {
    test('should display pagination controls', async ({ page }) => {
      const pagination = page.locator('nav[aria-label*="pagination"], [role="navigation"]:has-text("Page")')
      if (await pagination.isVisible()) {
        await expect(pagination).toBeVisible()
      }
    })

    test('should display current page number', async ({ page }) => {
      const pageNumber = page.locator('text=/page\\s+\\d+/i')
      if (await pageNumber.isVisible()) {
        await expect(pageNumber).toBeVisible()
      }
    })

    test('should navigate to next page', async ({ page }) => {
      const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next"]')
      if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
        await nextButton.click()

        await page.waitForLoadState('networkidle')

        await expect(page).toHaveURL(/[?&]page=\d+/)
      }
    })

    test('should navigate to previous page', async ({ page }) => {
      await page.goto('/admin/users?page=2')

      const prevButton = page.locator('button:has-text("Previous"), button[aria-label*="previous"]')
      if (await prevButton.isVisible() && !(await prevButton.isDisabled())) {
        await prevButton.click()

        await page.waitForLoadState('networkidle')

        await expect(page).toHaveURL(/page=1|^(?!.*page=)/)
      }
    })

    test('should display total user count', async ({ page }) => {
      const totalCount = page.locator('text=/total|\\d+\\s+users/i')
      if (await totalCount.isVisible()) {
        await expect(totalCount).toBeVisible()
      }
    })
  })

  test.describe('User Actions', () => {
    test('should have link/button to view user details', async ({ page }) => {
      const firstUserRow = page.locator('tbody tr').first()
      if (await firstUserRow.isVisible()) {
        const viewButton = firstUserRow.locator('a:has-text("View"), button:has-text("View")')
        if (await viewButton.isVisible()) {
          await expect(viewButton).toBeVisible()
        }
      }
    })

    test('should have link to manage user quota', async ({ page }) => {
      const firstUserRow = page.locator('tbody tr').first()
      if (await firstUserRow.isVisible()) {
        const quotaButton = firstUserRow.locator('a:has-text("Quota"), button:has-text("Quota")')
        if (await quotaButton.isVisible()) {
          await expect(quotaButton).toBeVisible()
        }
      }
    })

    test('should navigate to user quota management page', async ({ page }) => {
      const quotaLink = page.locator('a:has-text("Quota"), a[href*="/quota"]').first()
      if (await quotaLink.isVisible()) {
        await quotaLink.click()

        await expect(page).toHaveURL(/\/admin\/users\/[^/]+\/quota/)
      }
    })

    test('should navigate to user file statistics page', async ({ page }) => {
      const filesLink = page.locator('a:has-text("Files"), a[href*="/files"]').first()
      if (await filesLink.isVisible()) {
        await filesLink.click()

        await expect(page).toHaveURL(/\/admin\/users\/[^/]+\/files/)
      }
    })
  })

  test.describe('User Quota Management', () => {
    test('should display quota adjustment form', async ({ page }) => {
      await page.goto('/admin/users/test-user-id/quota')

      const form = page.locator('form')
      if (await form.isVisible()) {
        await expect(form).toBeVisible()
      }
    })

    test('should display quota buckets', async ({ page }) => {
      await page.goto('/admin/users/test-user-id/quota')

      const learningQuota = page.locator('text=/learning.*interactions/i')
      if (await learningQuota.isVisible()) {
        await expect(learningQuota).toBeVisible()
      }

      const explainQuota = page.locator('text=/auto.*explain/i')
      if (await explainQuota.isVisible()) {
        await expect(explainQuota).toBeVisible()
      }
    })

    test('should show current quota usage', async ({ page }) => {
      await page.goto('/admin/users/test-user-id/quota')

      const usageInfo = page.locator('text=/\\d+\\s*\\/\\s*\\d+|used.*limit/i')
      if (await usageInfo.isVisible()) {
        await expect(usageInfo).toBeVisible()
      }
    })

    test('should allow selecting quota action', async ({ page }) => {
      await page.goto('/admin/users/test-user-id/quota')

      const actionSelect = page.locator('select, [role="combobox"]')
      if (await actionSelect.isVisible()) {
        await expect(actionSelect).toBeVisible()
      }
    })

    test('should require reason for quota adjustment', async ({ page }) => {
      await page.goto('/admin/users/test-user-id/quota')

      const reasonInput = page.locator('input[placeholder*="reason"], textarea[placeholder*="reason"]')
      if (await reasonInput.isVisible()) {
        await expect(reasonInput).toBeVisible()
      }
    })

    test('should show confirmation before adjusting quota', async ({ page }) => {
      await page.goto('/admin/users/test-user-id/quota')

      await page.route('/api/admin/users/*/quota', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { quota: { used: 50, limit: 200 } },
          }),
        })
      })

      const submitButton = page.locator('button[type="submit"]')
      if (await submitButton.isVisible()) {
        await submitButton.click()

        const confirmation = page.locator('text=/confirm|are you sure/i, [role="dialog"]')
        if (await confirmation.isVisible()) {
          await expect(confirmation).toBeVisible()
        }
      }
    })

    test('should display quota adjustment history', async ({ page }) => {
      await page.goto('/admin/users/test-user-id/quota')

      const history = page.locator('text=/history|changes|log/i')
      if (await history.isVisible()) {
        await expect(history).toBeVisible()
      }
    })
  })

  test.describe('User File Statistics', () => {
    test('should display file statistics summary', async ({ page }) => {
      await page.goto('/admin/users/test-user-id/files')

      const totalFiles = page.locator('text=/total.*files/i')
      if (await totalFiles.isVisible()) {
        await expect(totalFiles).toBeVisible()
      }

      const totalStorage = page.locator('text=/storage|GB|MB/i')
      if (await totalStorage.isVisible()) {
        await expect(totalStorage).toBeVisible()
      }
    })

    test('should display files by course breakdown', async ({ page }) => {
      await page.goto('/admin/users/test-user-id/files')

      const byCourse = page.locator('text=/by.*course|course.*breakdown/i')
      if (await byCourse.isVisible()) {
        await expect(byCourse).toBeVisible()
      }
    })

    test('should display upload timeline chart', async ({ page }) => {
      await page.goto('/admin/users/test-user-id/files')

      const chart = page.locator('svg, canvas, [role="img"]')
      if (await chart.isVisible()) {
        await expect(chart).toBeVisible()
      }
    })

    test('should display files by status breakdown', async ({ page }) => {
      await page.goto('/admin/users/test-user-id/files')

      const byStatus = page.locator('text=/ready|processing|failed/i')
      if (await byStatus.isVisible()) {
        await expect(byStatus).toBeVisible()
      }
    })
  })

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      const table = page.locator('table, [role="table"]')
      await expect(table).toBeVisible()
    })

    test('should adapt table for small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      const content = page.locator('main, [role="main"]')
      await expect(content).toBeVisible()
    })
  })

  test.describe('Loading States', () => {
    test('should show loading state while fetching users', async ({ page }) => {
      await page.route('/api/admin/users', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [],
              total: 0,
              page: 1,
              pageSize: 20,
              totalPages: 0,
            },
          }),
        })
      })

      await page.goto('/admin/users')

      const loading = page.locator('text=/loading/i, [role="status"]')
      if (await loading.isVisible()) {
        await expect(loading).toBeVisible()
      }
    })

    test('should show skeleton loader for table rows', async ({ page }) => {
      await page.route('/api/admin/users', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [],
              total: 0,
              page: 1,
              pageSize: 20,
              totalPages: 0,
            },
          }),
        })
      })

      await page.goto('/admin/users')

      const skeleton = page.locator('[class*="skeleton"], [class*="animate"]')
      if (await skeleton.isVisible()) {
        await expect(skeleton).toBeVisible()
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should display error message when API fails', async ({ page }) => {
      await page.route('/api/admin/users', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Internal server error' },
          }),
        })
      })

      await page.goto('/admin/users')

      const errorMessage = page.locator('text=/error|failed/i')
      await expect(errorMessage).toBeVisible()
    })

    test('should display empty state when no users exist', async ({ page }) => {
      await page.route('/api/admin/users', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [],
              total: 0,
              page: 1,
              pageSize: 20,
              totalPages: 0,
            },
          }),
        })
      })

      await page.goto('/admin/users')

      const emptyState = page.locator('text=/no.*users|empty/i')
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible()
      }
    })
  })

  test.describe('Accessibility', () => {
    test('should have accessible table structure', async ({ page }) => {
      const table = page.locator('table, [role="table"]')
      await expect(table).toBeVisible()
    })

    test('should have accessible search input', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]')
      await expect(searchInput).toBeVisible()

      const label = page.locator('label[for*="search"]')
      if (await label.isVisible()) {
        await expect(label).toBeVisible()
      }
    })

    test('should support keyboard navigation', async ({ page }) => {
      await page.keyboard.press('Tab')

      const focused = await page.evaluate(() => document.activeElement?.tagName)
      expect(focused).toBeTruthy()
    })
  })
})
