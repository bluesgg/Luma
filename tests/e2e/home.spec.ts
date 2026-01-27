import { test, expect } from '@playwright/test'

test.describe('Home Page Smoke Tests', () => {
  test('should load home page successfully', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Luma/)
  })

  test('should display correct page title', async ({ page }) => {
    await page.goto('/')
    const title = await page.title()
    expect(title).toContain('Luma - AI-Powered Learning Platform')
  })

  test('should display main heading', async ({ page }) => {
    await page.goto('/')
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    await expect(heading).toContainText('Welcome to Luma')
  })

  test('should display description text', async ({ page }) => {
    await page.goto('/')
    const description = page.locator(
      'text=AI-powered learning management system'
    )
    await expect(description).toBeVisible()
  })

  test('should display Get Started button', async ({ page }) => {
    await page.goto('/')
    const getStartedButton = page.locator('a:has-text("Get Started")')
    await expect(getStartedButton).toBeVisible()
    expect(await getStartedButton.getAttribute('href')).toBe('/register')
  })

  test('should display Sign In button', async ({ page }) => {
    await page.goto('/')
    const signInButton = page.locator('a:has-text("Sign In")')
    await expect(signInButton).toBeVisible()
    expect(await signInButton.getAttribute('href')).toBe('/login')
  })

  test('should display Key Features section', async ({ page }) => {
    await page.goto('/')
    const featuresHeading = page.locator('text=Key Features')
    await expect(featuresHeading).toBeVisible()
  })

  test('should display all feature cards', async ({ page }) => {
    await page.goto('/')
    const featureCards = page.locator(
      'div:has-text("Course Management"), div:has-text("AI Interactive Tutor"), div:has-text("Knowledge Testing"), div:has-text("Progress Tracking"), div:has-text("Formula Recognition"), div:has-text("Smart Quota System")'
    )

    // Verify key features are present
    await expect(page.locator('text=Course Management')).toBeVisible()
    await expect(page.locator('text=AI Interactive Tutor')).toBeVisible()
    await expect(page.locator('text=Knowledge Testing')).toBeVisible()
    await expect(page.locator('text=Progress Tracking')).toBeVisible()
    await expect(page.locator('text=Formula Recognition')).toBeVisible()
    await expect(page.locator('text=Smart Quota System')).toBeVisible()
  })

  test('should display footer with current year', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()

    const currentYear = new Date().getFullYear()
    const footerText = page.locator(
      `text=© ${currentYear} Luma. All rights reserved.`
    )
    await expect(footerText).toBeVisible()
  })

  test('should render page without console errors', async ({ page }) => {
    let consoleErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')

    // Allow some time for any errors to be logged
    await page.waitForTimeout(1000)

    expect(consoleErrors).toHaveLength(0)
  })

  test('should have accessible heading structure', async ({ page }) => {
    await page.goto('/')
    const h1 = page.locator('h1')
    const h2s = page.locator('h2')

    await expect(h1).toHaveCount(1)
    const h2Count = await h2s.count()
    expect(h2Count).toBeGreaterThan(0)
  })
})
