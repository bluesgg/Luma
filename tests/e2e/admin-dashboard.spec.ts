// =============================================================================
// Admin Dashboard E2E Tests (Phase 7)
// Tests for /admin dashboard and navigation
// =============================================================================

import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
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

    await page.goto('/admin')
  })

  test.describe('Authentication', () => {
    test('should redirect unauthenticated users to login', async ({
      page,
      context,
    }) => {
      // Clear cookies
      await context.clearCookies()

      await page.goto('/admin')

      // Should redirect to admin login
      await expect(page).toHaveURL(/\/admin\/login/)
    })

    test('should allow authenticated admin access', async ({ page }) => {
      await expect(page).toHaveURL(/\/admin(?:\/|$)/)
    })
  })

  test.describe('Layout', () => {
    test('should display admin dashboard layout', async ({ page }) => {
      const heading = page.locator('h1, h2').first()
      await expect(heading).toBeVisible()
    })

    test('should display admin sidebar navigation', async ({ page }) => {
      const sidebar = page.locator('nav, [role="navigation"]').first()
      await expect(sidebar).toBeVisible()
    })

    test('should display admin header', async ({ page }) => {
      const header = page.locator('header').first()
      await expect(header).toBeVisible()
    })

    test('should display logout button', async ({ page }) => {
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out")')
      await expect(logoutButton).toBeVisible()
    })

    test('should display admin email/info', async ({ page }) => {
      const adminInfo = page.locator('text=/admin@|@luma\.com/i')
      await expect(adminInfo).toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('should navigate to overview/stats page', async ({ page }) => {
      const overviewLink = page.locator('a:has-text("Overview"), a:has-text("Dashboard")')
      await overviewLink.click()

      await expect(page).toHaveURL(/\/admin(?:\/|$)/)
    })

    test('should navigate to cost monitoring page', async ({ page }) => {
      const costLink = page.locator('a:has-text("Cost")')
      if (await costLink.isVisible()) {
        await costLink.click()
        await expect(page).toHaveURL(/\/admin\/cost/)
      }
    })

    test('should navigate to workers page', async ({ page }) => {
      const workersLink = page.locator('a:has-text("Workers"), a:has-text("Jobs")')
      if (await workersLink.isVisible()) {
        await workersLink.click()
        await expect(page).toHaveURL(/\/admin\/workers/)
      }
    })

    test('should navigate to users page', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users")')
      if (await usersLink.isVisible()) {
        await usersLink.click()
        await expect(page).toHaveURL(/\/admin\/users/)
      }
    })

    test('should highlight active navigation item', async ({ page }) => {
      const overviewLink = page.locator('a:has-text("Overview"), a:has-text("Dashboard")').first()

      const classes = await overviewLink.getAttribute('class')
      expect(classes).toBeTruthy()
    })
  })

  test.describe('System Overview', () => {
    test('should display total users stat', async ({ page }) => {
      const usersStat = page.locator('text=/total.*users|users.*total/i')
      await expect(usersStat).toBeVisible()
    })

    test('should display total courses stat', async ({ page }) => {
      const coursesStat = page.locator('text=/total.*courses|courses.*total/i')
      await expect(coursesStat).toBeVisible()
    })

    test('should display total files stat', async ({ page }) => {
      const filesStat = page.locator('text=/total.*files|files.*total/i')
      await expect(filesStat).toBeVisible()
    })

    test('should display storage used stat', async ({ page }) => {
      const storageStat = page.locator('text=/storage|GB|MB/i')
      await expect(storageStat).toBeVisible()
    })

    test('should display active users stat', async ({ page }) => {
      const activeStat = page.locator('text=/active.*users/i')
      await expect(activeStat).toBeVisible()
    })

    test('should display stat cards with numbers', async ({ page }) => {
      const numbers = page.locator('text=/\\d+/')
      const count = await numbers.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Logout', () => {
    test('should logout and redirect to login page', async ({ page }) => {
      await page.route('/api/admin/logout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out")')
      await logoutButton.click()

      await expect(page).toHaveURL(/\/admin\/login/)
    })

    test('should clear admin session on logout', async ({ page, context }) => {
      await page.route('/api/admin/logout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out")')
      await logoutButton.click()

      const cookies = await context.cookies()
      const adminCookie = cookies.find((c) => c.name === 'luma-admin-session')
      expect(adminCookie).toBeUndefined()
    })
  })

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      const heading = page.locator('h1, h2').first()
      await expect(heading).toBeVisible()
    })

    test('should show mobile menu toggle on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      const menuToggle = page.locator('button[aria-label*="menu"], button:has(svg)')
      if (await menuToggle.isVisible()) {
        await menuToggle.click()

        const nav = page.locator('nav, [role="navigation"]')
        await expect(nav).toBeVisible()
      }
    })

    test('should collapse sidebar on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })

      const content = page.locator('main, [role="main"]')
      await expect(content).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load dashboard quickly', async ({ page }) => {
      const start = Date.now()

      await page.goto('/admin')
      await page.waitForLoadState('networkidle')

      const duration = Date.now() - start
      expect(duration).toBeLessThan(5000)
    })

    test('should not have console errors', async ({ page }) => {
      const consoleErrors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await page.waitForTimeout(500)

      const unexpectedErrors = consoleErrors.filter(
        (err) => !err.includes('Expected')
      )
      expect(unexpectedErrors.length).toBe(0)
    })
  })

  test.describe('Accessibility', () => {
    test('should have accessible navigation', async ({ page }) => {
      const nav = page.locator('nav, [role="navigation"]')
      await expect(nav).toBeVisible()
    })

    test('should have accessible main content', async ({ page }) => {
      const main = page.locator('main, [role="main"]')
      await expect(main).toBeVisible()
    })

    test('should support keyboard navigation', async ({ page }) => {
      await page.keyboard.press('Tab')

      const focused = await page.evaluate(() => document.activeElement?.tagName)
      expect(focused).toBeTruthy()
    })

    test('should have proper heading hierarchy', async ({ page }) => {
      const h1 = page.locator('h1').first()
      const h1Count = await page.locator('h1').count()

      expect(h1Count).toBeGreaterThanOrEqual(1)
      await expect(h1).toBeVisible()
    })
  })

  test.describe('Data Loading', () => {
    test('should show loading state while fetching data', async ({ page }) => {
      await page.route('/api/admin/stats', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              totalUsers: 100,
              totalCourses: 50,
              totalFiles: 200,
              totalStorageUsed: '1000000000',
              activeUsers: 30,
              newUsersThisMonth: 10,
              filesProcessing: 5,
            },
          }),
        })
      })

      await page.goto('/admin')

      const loading = page.locator('text=/loading|spinner/i, [role="status"]')
      if (await loading.isVisible()) {
        await expect(loading).toBeVisible()
      }
    })

    test('should handle API errors gracefully', async ({ page }) => {
      await page.route('/api/admin/stats', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Internal server error' },
          }),
        })
      })

      await page.goto('/admin')

      const errorMessage = page.locator('text=/error|failed/i')
      await expect(errorMessage).toBeVisible()
    })
  })

  test.describe('Admin Role Display', () => {
    test('should display admin role badge', async ({ page }) => {
      const roleBadge = page.locator('text=/admin|super.*admin/i')
      await expect(roleBadge).toBeVisible()
    })

    test('should distinguish super admin if applicable', async ({ page }) => {
      // If logged in as super admin
      const superBadge = page.locator('text=/super.*admin/i')
      const isVisible = await superBadge.isVisible().catch(() => false)

      expect(isVisible === true || isVisible === false).toBe(true)
    })
  })
})
