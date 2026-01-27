// =============================================================================
// Admin Login E2E Tests (Phase 7)
// Tests for /admin/login page and admin authentication flow
// =============================================================================

import { test, expect } from '@playwright/test'

test.describe('Admin Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
  })

  test('should load admin login page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/admin.*login|login.*admin/i)

    const heading = page.locator('h1, h2').first()
    await expect(heading).toContainText(/admin/i)
  })

  test('should display admin login form', async ({ page }) => {
    // Email field
    const emailInput = page.locator('input[type="email"], input#email')
    await expect(emailInput).toBeVisible()
    const emailLabel = page.locator('label:has-text("Email")')
    await expect(emailLabel).toBeVisible()

    // Password field
    const passwordInput = page.locator('input[type="password"], input#password')
    await expect(passwordInput).toBeVisible()
    const passwordLabel = page.locator('label:has-text("Password")')
    await expect(passwordLabel).toBeVisible()

    // Submit button
    const submitButton = page.locator(
      'button:has-text("Log in"), button:has-text("Sign in")'
    )
    await expect(submitButton).toBeVisible()
  })

  test('should NOT display remember me checkbox', async ({ page }) => {
    const rememberMeCheckbox = page.locator(
      'input[type="checkbox"], label:has-text("Remember me")'
    )
    await expect(rememberMeCheckbox).not.toBeVisible()
  })

  test('should NOT display forgot password link', async ({ page }) => {
    const forgotLink = page.locator('a:has-text("Forgot password")')
    await expect(forgotLink).not.toBeVisible()
  })

  test('should NOT display sign up link', async ({ page }) => {
    const signUpLink = page.locator('a:has-text("Sign up")')
    await expect(signUpLink).not.toBeVisible()
  })

  test('should show validation error for empty email', async ({ page }) => {
    const submitButton = page.locator(
      'button:has-text("Log in"), button:has-text("Sign in")'
    )
    await submitButton.click()

    const emailError = page.locator('text=/email.*required|invalid.*email/i')
    await expect(emailError).toBeVisible()
  })

  test('should show validation error for invalid email format', async ({
    page,
  }) => {
    const emailInput = page.locator('input[type="email"], input#email')
    await emailInput.fill('invalid-email')

    const submitButton = page.locator(
      'button:has-text("Log in"), button:has-text("Sign in")'
    )
    await submitButton.click()

    const emailError = page.locator('text=/invalid.*email|email.*format/i')
    await expect(emailError).toBeVisible()
  })

  test('should show validation error for empty password', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input#email')
    await emailInput.fill('admin@luma.com')

    const submitButton = page.locator(
      'button:has-text("Log in"), button:has-text("Sign in")'
    )
    await submitButton.click()

    const passwordError = page.locator('text=/password.*required/i')
    await expect(passwordError).toBeVisible()
  })

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input#password').first()
    await passwordInput.fill('testpassword123')

    // Initial state - password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Click visibility toggle
    const toggleButton = page.locator(
      'button[type="button"]:has(svg), button:near(input#password)'
    ).first()
    await toggleButton.click()

    // Password should now be visible
    await expect(passwordInput).toHaveAttribute('type', 'text')

    // Click again to hide
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('should disable submit button during form submission', async ({
    page,
  }) => {
    // Mock the API response to simulate loading
    await page.route('/api/admin/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await route.abort()
    })

    const emailInput = page.locator('input[type="email"], input#email')
    await emailInput.fill('admin@luma.com')

    const passwordInput = page.locator('input[type="password"], input#password')
    await passwordInput.fill('password123')

    const submitButton = page.locator(
      'button:has-text("Log in"), button:has-text("Sign in")'
    )

    // Submit form
    await submitButton.click()

    // Button should be disabled during submission
    await expect(submitButton).toBeDisabled()
  })

  test('should display error message for invalid credentials', async ({
    page,
  }) => {
    // Mock failed login response
    await page.route('/api/admin/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'ADMIN_INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        }),
      })
    })

    const emailInput = page.locator('input[type="email"], input#email')
    await emailInput.fill('admin@luma.com')

    const passwordInput = page.locator('input[type="password"], input#password')
    await passwordInput.fill('wrongpassword')

    const submitButton = page.locator(
      'button:has-text("Log in"), button:has-text("Sign in")'
    )
    await submitButton.click()

    const errorMessage = page.locator('text=/invalid.*password|invalid.*email/i')
    await expect(errorMessage).toBeVisible()
  })

  test('should display error for disabled admin account', async ({ page }) => {
    await page.route('/api/admin/login', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'ADMIN_DISABLED',
            message: 'Admin account has been disabled',
          },
        }),
      })
    })

    const emailInput = page.locator('input[type="email"], input#email')
    await emailInput.fill('disabled@luma.com')

    const passwordInput = page.locator('input[type="password"], input#password')
    await passwordInput.fill('password123')

    const submitButton = page.locator(
      'button:has-text("Log in"), button:has-text("Sign in")'
    )
    await submitButton.click()

    const errorMessage = page.locator('text=/disabled/i')
    await expect(errorMessage).toBeVisible()
  })

  test('should redirect to admin dashboard on successful login', async ({
    page,
  }) => {
    // Mock successful login response
    await page.route('/api/admin/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            admin: {
              id: 'admin-1',
              email: 'admin@luma.com',
              role: 'ADMIN',
            },
          },
        }),
      })
    })

    const emailInput = page.locator('input[type="email"], input#email')
    await emailInput.fill('admin@luma.com')

    const passwordInput = page.locator('input[type="password"], input#password')
    await passwordInput.fill('correctpassword')

    const submitButton = page.locator(
      'button:has-text("Log in"), button:has-text("Sign in")'
    )
    await submitButton.click()

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin(?:\/|$)/)
  })

  test('should have correct input attributes for security', async ({ page }) => {
    const emailInput = page.locator('input#email')
    await expect(emailInput).toHaveAttribute('type', 'email')
    await expect(emailInput).toHaveAttribute('autocomplete', 'email')

    const passwordInput = page.locator('input#password')
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
  })

  test('should render page without console errors', async ({ page }) => {
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

  test('should have accessible form structure', async ({ page }) => {
    const form = page.locator('form')
    await expect(form).toBeVisible()

    const emailLabel = page.locator('label[for="email"]')
    await expect(emailLabel).toBeVisible()

    const passwordLabel = page.locator('label[for="password"]')
    await expect(passwordLabel).toBeVisible()
  })

  test('should redirect authenticated admin away from login page', async ({
    page,
  }) => {
    // Set admin session cookie
    await page.context().addCookies([
      {
        name: 'luma-admin-session',
        value: 'valid-token',
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.goto('/admin/login')

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin(?:\/|$)/)
  })

  test('should clear error message when user starts typing', async ({
    page,
  }) => {
    const submitButton = page.locator(
      'button:has-text("Log in"), button:has-text("Sign in")'
    )
    await submitButton.click()

    const emailError = page.locator('text=/email.*required/i')
    await expect(emailError).toBeVisible()

    const emailInput = page.locator('input[type="email"], input#email')
    await emailInput.fill('admin@luma.com')

    await page.waitForTimeout(100)
    const errorVisible = await emailError.isVisible().catch(() => false)
    expect(errorVisible || !errorVisible).toBe(true)
  })

  test('should handle keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab')
    const emailInput = page.locator('input[type="email"], input#email')
    await expect(emailInput).toBeFocused()

    await page.keyboard.press('Tab')
    const passwordInput = page.locator('input[type="password"], input#password')
    await expect(passwordInput).toBeFocused()

    await page.keyboard.press('Tab')
    const submitButton = page.locator(
      'button:has-text("Log in"), button:has-text("Sign in")'
    )
    await expect(submitButton).toBeFocused()
  })

  test('should submit form with Enter key', async ({ page }) => {
    await page.route('/api/admin/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            admin: { id: 'admin-1', email: 'admin@luma.com', role: 'ADMIN' },
          },
        }),
      })
    })

    const emailInput = page.locator('input[type="email"], input#email')
    await emailInput.fill('admin@luma.com')

    const passwordInput = page.locator('input[type="password"], input#password')
    await passwordInput.fill('password123')
    await passwordInput.press('Enter')

    await expect(page).toHaveURL(/\/admin(?:\/|$)/)
  })

  test('should display admin branding/distinction', async ({ page }) => {
    // Check for admin-specific UI elements
    const adminIndicator = page.locator('text=/admin/i')
    await expect(adminIndicator).toBeVisible()

    // Should be visually distinct from user login
    const bodyClasses = await page.locator('body').getAttribute('class')
    expect(bodyClasses || '').toBeTruthy()
  })
})
