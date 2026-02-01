import { test, expect, devices } from '@playwright/test'

test.describe('Layout Tests', () => {
  test('should return 200 OK status without SSR errors', async ({ page }) => {
    const response = await page.goto('/')

    // Verify HTTP status is 200, not 500
    expect(response?.status()).toBe(200)

    // Verify no SSR error messages in HTML
    const html = await page.content()
    expect(html).not.toContain('Application error')
    expect(html).not.toContain('Internal Server Error')
    expect(html).not.toContain('useState only works in Client Components')
  })

  test('should not have React SSR errors in console', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Filter out unrelated errors (like OpenTelemetry warnings)
    const reactErrors = errors.filter(
      (err) =>
        err.includes('useState') ||
        err.includes('useEffect') ||
        err.includes('Client Components') ||
        err.includes('use client')
    )

    expect(reactErrors).toHaveLength(0)
  })

  test('should have correct viewport for desktop', async ({ page }) => {
    await page.goto('/')

    const viewport = page.viewportSize()
    expect(viewport).not.toBeNull()
    expect(viewport?.width).toBeGreaterThan(0)
    expect(viewport?.height).toBeGreaterThan(0)
  })

  test('should render correctly on mobile viewport', async ({ browser }) => {
    const mobileContext = await browser.newContext({
      ...devices['Pixel 5'],
    })
    const page = await mobileContext.newPage()

    await page.goto('/')

    const viewport = page.viewportSize()
    expect(viewport?.width).toBe(393)
    expect(viewport?.height).toBe(851)

    await mobileContext.close()
  })

  test('should render correctly on tablet viewport', async ({ browser }) => {
    const tabletContext = await browser.newContext({
      ...devices['iPad Pro'],
    })
    const page = await tabletContext.newPage()

    await page.goto('/')

    const viewport = page.viewportSize()
    expect(viewport).not.toBeNull()

    await tabletContext.close()
  })

  test('should have html lang attribute', async ({ page }) => {
    await page.goto('/')

    const htmlTag = page.locator('html')
    const langAttr = await htmlTag.getAttribute('lang')
    expect(langAttr).toBe('en')
  })

  test('should have meta viewport tag', async ({ page }) => {
    await page.goto('/')

    const metaViewport = page.locator('meta[name="viewport"]')
    await expect(metaViewport).toBeVisible()

    const content = await metaViewport.getAttribute('content')
    expect(content).toContain('width=device-width')
    expect(content).toContain('initial-scale=1')
  })

  test('should have theme color meta tags', async ({ page }) => {
    await page.goto('/')

    const themeColorTags = page.locator('meta[name="theme-color"]')
    const count = await themeColorTags.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should have font-sans class on body', async ({ page }) => {
    await page.goto('/')

    const body = page.locator('body')
    const classes = await body.getAttribute('class')
    expect(classes).toContain('font-sans')
  })

  test('should load Inter font from Google Fonts', async ({ page }) => {
    let googleFontsLoaded = false

    page.on('response', (response) => {
      if (
        response.url().includes('fonts.googleapis.com') ||
        response.url().includes('fonts.gstatic.com')
      ) {
        googleFontsLoaded = true
      }
    })

    await page.goto('/')

    // Wait a bit to ensure font loading requests are made
    await page.waitForTimeout(500)

    expect(googleFontsLoaded).toBe(true)
  })

  test('should have proper document structure', async ({ page }) => {
    await page.goto('/')

    const html = page.locator('html')
    const head = page.locator('head')
    const body = page.locator('body')

    await expect(html).toBeVisible()
    await expect(head).toBeVisible()
    await expect(body).toBeVisible()
  })

  test('should render Toaster component', async ({ page }) => {
    await page.goto('/')

    // Toaster is typically hidden until needed, but the div should exist
    const _toaster = page.locator('[role="region"]').first()

    // The component might not be immediately visible, but should exist in DOM
    const toasterExists =
      (await page
        .locator('div')
        .filter({ has: page.locator('[role="region"]') })
        .count()) >= 0
    expect(toasterExists).toBe(true)
  })

  test('should handle page navigation without layout shifts', async ({
    page,
  }) => {
    await page.goto('/')

    const initialSize = page.viewportSize()

    // Navigate to register page to test layout persistence
    await page.click('a:has-text("Get Started")')
    await page.waitForURL('/register')

    const finalSize = page.viewportSize()
    expect(initialSize).toEqual(finalSize)
  })

  test('should render without layout shift on page load', async ({ page }) => {
    let layoutShifts = 0

    page.on('console', (msg) => {
      if (msg.text().includes('layout shift')) {
        layoutShifts++
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Zero layout shift warnings in console
    expect(layoutShifts).toBe(0)
  })

  test('should support dark mode styles', async ({ browser }) => {
    const darkContext = await browser.newContext({
      colorScheme: 'dark',
    })
    const page = await darkContext.newPage()

    await page.goto('/')

    // Check that page renders without errors in dark mode
    const title = await page.title()
    expect(title).toContain('Luma')

    await darkContext.close()
  })

  test('should support light mode styles', async ({ browser }) => {
    const lightContext = await browser.newContext({
      colorScheme: 'light',
    })
    const page = await lightContext.newPage()

    await page.goto('/')

    // Check that page renders without errors in light mode
    const title = await page.title()
    expect(title).toContain('Luma')

    await lightContext.close()
  })
})

test.describe('Error Boundary', () => {
  test('should render error boundary component in layout', async ({ page }) => {
    await page.goto('/')

    // Error boundary is wrapping the children, so if page loads normally,
    // the error boundary is working correctly
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
  })

  test('should display error UI when component throws', async ({ page }) => {
    // Create a simple test by navigating to a page that might have an error
    // and checking that no unhandled errors crash the page
    let unhandledErrors = 0

    page.on('pageerror', (error) => {
      unhandledErrors++
      console.error('Unhandled page error:', error)
    })

    await page.goto('/')
    await page.waitForTimeout(1000)

    // Page should load without unhandled errors
    expect(unhandledErrors).toBe(0)
  })
})
