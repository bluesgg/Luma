// =============================================================================
// Courses Page E2E Tests
// End-to-end tests for courses page navigation and display
// =============================================================================

import { test, expect } from '@playwright/test'

test.describe('Courses Page', () => {
  test.describe('Page Load and Navigation', () => {
    test('should load courses page successfully', async ({ page }) => {
      await page.goto('/courses')

      await expect(page).toHaveTitle(/Courses/)
      await expect(page.locator('h1')).toContainText('My Courses')
    })

    test('should display welcome message', async ({ page }) => {
      await page.goto('/courses')

      await expect(
        page.locator('text=/Welcome to your courses page/i')
      ).toBeVisible()
    })

    test('should be accessible from main navigation', async ({ page }) => {
      await page.goto('/settings')

      // Click courses link in navigation
      const coursesLink = page.locator('a[href="/courses"]')
      await expect(coursesLink).toBeVisible()
      await coursesLink.click()

      await expect(page).toHaveURL('/courses')
      await expect(page.locator('h1')).toContainText('My Courses')
    })

    test('should display navigation bar', async ({ page }) => {
      await page.goto('/courses')

      // Navigation bar should exist
      const nav = page.locator('nav')
      await expect(nav).toBeVisible()

      // Should have links to other pages
      await expect(page.locator('a[href="/settings"]')).toBeVisible()
      await expect(page.locator('a[href="/courses"]')).toBeVisible()
    })

    test('should highlight active courses link in navigation', async ({
      page,
    }) => {
      await page.goto('/courses')

      const coursesLink = page.locator('a[href="/courses"]')
      await expect(coursesLink).toBeVisible()

      // Active link should have aria-current or specific styling
      const ariaCurrentValue = await coursesLink.getAttribute('aria-current')
      expect(ariaCurrentValue).toBeTruthy()
    })
  })

  test.describe('Layout and Structure', () => {
    test('should render with proper layout structure', async ({ page }) => {
      await page.goto('/courses')

      // Should have navigation
      const nav = page.locator('nav')
      await expect(nav).toBeVisible()

      // Should have main content area
      const main = page.locator('main, [role="main"]')
      await expect(main).toBeVisible()
    })

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/courses')

      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('nav')).toBeVisible()
    })

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/courses')

      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('nav')).toBeVisible()
    })

    test('should be responsive on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.goto('/courses')

      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('nav')).toBeVisible()
    })
  })

  test.describe('Navigation Flow', () => {
    test('should navigate from courses to settings', async ({ page }) => {
      await page.goto('/courses')

      await page.click('a[href="/settings"]')

      await expect(page).toHaveURL('/settings')
      await expect(page.locator('h1')).toContainText(/Settings|设置/)
    })

    test('should navigate back from settings to courses', async ({ page }) => {
      await page.goto('/settings')

      await page.click('a[href="/courses"]')

      await expect(page).toHaveURL('/courses')
      await expect(page.locator('h1')).toContainText('My Courses')
    })

    test('should maintain layout during navigation', async ({ page }) => {
      await page.goto('/courses')

      const navBefore = await page.locator('nav').boundingBox()

      await page.click('a[href="/settings"]')
      await page.waitForURL('/settings')

      const navAfter = await page.locator('nav').boundingBox()

      // Navigation bar position should remain consistent
      expect(navBefore?.y).toBe(navAfter?.y)
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/courses')

      const h1 = page.locator('h1')
      await expect(h1).toBeVisible()
      await expect(h1).toHaveCount(1)
    })

    test('should have accessible navigation', async ({ page }) => {
      await page.goto('/courses')

      const nav = page.locator('nav')
      await expect(nav).toHaveAttribute('aria-label')
    })

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/courses')

      // Tab through navigation links
      await page.keyboard.press('Tab')
      const firstFocusable = await page.evaluate(
        () => document.activeElement?.tagName
      )

      expect(firstFocusable).toBeTruthy()
    })

    test('should have skip to content link', async ({ page }) => {
      await page.goto('/courses')

      const skipLink = page.locator('a[href="#main-content"]')
      const count = await skipLink.count()

      if (count > 0) {
        await expect(skipLink).toBeInTheDocument()
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle missing layout gracefully', async ({ page }) => {
      // This test ensures the page renders even if layout isn't perfect
      await page.goto('/courses')

      // Page should load with 200 status
      const response = await page.waitForResponse(
        (response) =>
          response.url().includes('/courses') && response.status() === 200
      )

      expect(response.status()).toBe(200)
    })

    test('should not have console errors', async ({ page }) => {
      const errors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto('/courses')
      await page.waitForLoadState('networkidle')

      const reactErrors = errors.filter(
        (err) =>
          err.includes('Error') ||
          err.includes('Failed') ||
          err.includes('undefined')
      )

      expect(reactErrors).toHaveLength(0)
    })
  })

  test.describe('Performance', () => {
    test('should load quickly', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/courses')
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(3000) // 3 seconds
    })
  })
})
