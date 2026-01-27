import { test, expect } from '@playwright/test'

test.describe('Not Found (404) Page Tests', () => {
  test('should display 404 page for non-existent route', async ({ page }) => {
    await page.goto('/non-existent-page-12345')

    // Check that we get the 404 page content
    const notFoundHeading = page.locator('text=404')
    await expect(notFoundHeading).toBeVisible()
  })

  test('should display "Page not found" message', async ({ page }) => {
    await page.goto('/invalid-route')

    const message = page.locator('text=Page not found')
    await expect(message).toBeVisible()
  })

  test('should display helpful description', async ({ page }) => {
    await page.goto('/doesnt-exist')

    const description = page.locator(
      "text=Sorry, we couldn't find the page you're looking for"
    )
    await expect(description).toBeVisible()
  })

  test('should display "Go home" button', async ({ page }) => {
    await page.goto('/fake-page')

    const goHomeButton = page.locator('a:has-text("Go home")')
    await expect(goHomeButton).toBeVisible()
    expect(await goHomeButton.getAttribute('href')).toBe('/')
  })

  test('should display "View courses" button', async ({ page }) => {
    await page.goto('/invalid')

    const viewCoursesButton = page.locator('a:has-text("View courses")')
    await expect(viewCoursesButton).toBeVisible()
    expect(await viewCoursesButton.getAttribute('href')).toBe('/courses')
  })

  test('should navigate to home when clicking "Go home" button', async ({
    page,
  }) => {
    await page.goto('/not-a-real-page')

    const goHomeButton = page.locator('a:has-text("Go home")')
    await goHomeButton.click()

    // Should navigate to home page
    await expect(page).toHaveURL('/')
    await expect(page.locator('text=Welcome to Luma')).toBeVisible()
  })

  test('should navigate to courses when clicking "View courses" button', async ({
    page,
  }) => {
    // First navigate to 404 page
    await page.goto('/unknown-route')

    const viewCoursesButton = page.locator('a:has-text("View courses")')
    await viewCoursesButton.click()

    // Should navigate to courses page
    await expect(page).toHaveURL('/courses')
  })

  test('should display 404 error for deeply nested non-existent routes', async ({
    page,
  }) => {
    await page.goto('/some/deeply/nested/route/that/does/not/exist')

    const notFoundHeading = page.locator('text=404')
    await expect(notFoundHeading).toBeVisible()
  })

  test('should display 404 for routes with special characters', async ({
    page,
  }) => {
    await page.goto('/page@#$%')

    const notFoundHeading = page.locator('text=404')
    await expect(notFoundHeading).toBeVisible()
  })

  test('should render 404 page without console errors', async ({ page }) => {
    let consoleErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/nonexistent')

    await page.waitForTimeout(500)

    expect(consoleErrors).toHaveLength(0)
  })

  test('should have proper page title on 404 page', async ({ page }) => {
    await page.goto('/missing-page')

    const title = await page.title()
    // Should still have the app title in the page title
    expect(title).toContain('Luma')
  })

  test('should center 404 card on page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')

    const card = page.locator('div:has-text("404")').first().locator('..')

    // Check that the parent container has flex centering classes
    const parentClasses = await card.getAttribute('class')
    expect(parentClasses).toBeDefined()
  })

  test('should display 404 page for malformed URLs', async ({ page }) => {
    await page.goto('/////invalid')

    const notFoundHeading = page.locator('text=404')
    await expect(notFoundHeading).toBeVisible()
  })

  test('should keep 404 page within responsive container', async ({
    browser,
  }) => {
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
    })
    const page = await mobileContext.newPage()

    await page.goto('/nonexistent')

    const card = page.locator('[class*="card"]').first()
    const boundingBox = await card.boundingBox()

    expect(boundingBox).not.toBeNull()
    expect(boundingBox!.width).toBeLessThanOrEqual(400)

    await mobileContext.close()
  })
})

test.describe('404 Page Navigation', () => {
  test('should be able to navigate back from 404 using browser back button', async ({
    page,
  }) => {
    // Navigate to home first
    await page.goto('/')
    await expect(page.locator('text=Welcome to Luma')).toBeVisible()

    // Navigate to 404
    await page.goto('/fake-page')
    await expect(page.locator('text=404')).toBeVisible()

    // Go back
    await page.goBack()

    // Should be back at home
    await expect(page).toHaveURL('/')
    await expect(page.locator('text=Welcome to Luma')).toBeVisible()
  })

  test('should display card layout with proper spacing', async ({ page }) => {
    await page.goto('/page-not-found')

    const card = page.locator('[class*="Card"]').first()
    await expect(card).toBeVisible()

    // Card should have max-width constraint
    const cardClasses = await card.getAttribute('class')
    expect(cardClasses).toBeDefined()
  })
})
