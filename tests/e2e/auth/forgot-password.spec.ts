import { test, expect } from '@playwright/test'

/**
 * E2E Tests for the Forgot Password Page
 *
 * These tests run against the actual application in a real browser
 * to verify the complete forgot password user journey.
 */

test.describe('Forgot Password Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock CSRF endpoint to provide a valid token
    await page.route('**/api/csrf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'test-csrf-token' }),
      })
    })

    // Navigate to forgot password page before each test
    await page.goto('/forgot-password')
  })

  test.describe('Page Rendering and Branding', () => {
    test('displays the forgot password page with Luma branding', async ({ page }) => {
      // Check page title
      await expect(page).toHaveTitle(/Forgot Password - Luma/)

      // Check Luma brand name is visible
      const brandName = page.locator('text=Luma').first()
      await expect(brandName).toBeVisible()

      // Check tagline is visible
      await expect(page.getByText('AI-Powered PDF Learning Assistant')).toBeVisible()
    })

    test('displays the BookOpen logo icon', async ({ page }) => {
      // The BookOpen icon should be visible next to the brand name
      const brandContainer = page.locator('.mb-8.flex.items-center.gap-2')
      await expect(brandContainer).toBeVisible()

      // Check SVG icon exists with indigo color
      const logoIcon = brandContainer.locator('svg')
      await expect(logoIcon).toBeVisible()
      await expect(logoIcon).toHaveClass(/text-indigo-600/)
    })

    test('has correct page layout and background', async ({ page }) => {
      // Check main container has correct styling
      const mainContainer = page.locator('div.flex.min-h-screen')
      await expect(mainContainer).toBeVisible()
      await expect(mainContainer).toHaveClass(/bg-slate-50/)
    })
  })

  test.describe('Forgot Password Form Display', () => {
    test('displays the forgot password form card with title and description', async ({ page }) => {
      // Check card header
      await expect(page.getByText('Forgot password')).toBeVisible()
      await expect(
        page.getByText("Enter your email address and we'll send you a reset link")
      ).toBeVisible()
    })

    test('displays email input field with correct attributes', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i)
      await expect(emailInput).toBeVisible()
      await expect(emailInput).toHaveAttribute('type', 'email')
      await expect(emailInput).toHaveAttribute('placeholder', 'you@example.com')
      await expect(emailInput).toHaveAttribute('autocomplete', 'email')
    })

    test('displays Send reset link submit button', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /send reset link/i })
      await expect(submitButton).toBeVisible()
      await expect(submitButton).toHaveAttribute('type', 'submit')
    })

    test('displays email input field icon', async ({ page }) => {
      // Email field should have Mail icon
      const emailFieldContainer = page.getByLabel(/email/i).locator('..')
      const emailIcon = emailFieldContainer.locator('svg')
      await expect(emailIcon).toBeVisible()
    })
  })

  test.describe('Form Validation', () => {
    test('prevents submission with invalid email format (browser validation)', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('invalid-email')
      await submitButton.click()

      // Browser's HTML5 validation prevents form submission for invalid email format
      const isEmailInvalid = await emailInput.evaluate(
        (el: HTMLInputElement) => !el.validity.valid
      )
      expect(isEmailInvalid).toBe(true)

      // Form should still be visible (not submitted)
      await expect(submitButton).toBeVisible()
    })

    test('shows validation error for invalid email format (Zod validation)', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      // Use a technically valid but malformed email to bypass browser validation
      // and test Zod validation
      await emailInput.fill('a@b')
      await submitButton.click()

      // Should show Zod validation error
      await expect(page.getByText(/please enter a valid email address/i)).toBeVisible({
        timeout: 10000,
      })
    })

    test('requires email field to be filled', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      // Attempt to submit with empty email
      await submitButton.click()

      // Form should still be visible (not submitted) because email is empty
      await expect(submitButton).toBeVisible()
      await expect(emailInput).toBeVisible()
    })
  })

  test.describe('Loading State', () => {
    test('disables submit button during form submission', async ({ page }) => {
      // Mock the API response to delay
      await page.route('**/api/auth/reset-password', async (route) => {
        // Delay the response to observe loading state
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Button should be disabled and show loading text
      await expect(page.getByRole('button', { name: /sending/i })).toBeDisabled()
    })

    test('shows loading spinner during submission', async ({ page }) => {
      // Mock the API response to delay
      await page.route('**/api/auth/reset-password', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Should show loading spinner (animate-spin class on SVG)
      const loadingSpinner = page.locator('button svg.animate-spin')
      await expect(loadingSpinner).toBeVisible()
    })

    test('disables email input during submission', async ({ page }) => {
      // Mock the API response to delay
      await page.route('**/api/auth/reset-password', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Email input should be disabled
      await expect(emailInput).toBeDisabled()
    })
  })

  test.describe('Error Messages Display', () => {
    test('displays error message for rate limiting', async ({ page }) => {
      // Mock API response for rate limiting
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'AUTH_RATE_LIMITED',
              message: 'Too many reset attempts. Please try again later.',
            },
          }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Should show error alert
      const alert = page.locator('[role="alert"]').filter({ hasText: 'Too many reset attempts' })
      await expect(alert).toBeVisible()
    })

    test('displays generic error for network failure', async ({ page }) => {
      // Mock network error
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.abort('failed')
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Should show error alert
      const alert = page.locator('[role="alert"]').filter({ hasText: 'unexpected error' })
      await expect(alert).toBeVisible()
    })

    test('displays error message from API response', async ({ page }) => {
      // Mock API error response
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Failed to send reset email. Please try again.' },
          }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Should show error alert
      const alert = page.locator('[role="alert"]').filter({ hasText: 'Failed to send reset email' })
      await expect(alert).toBeVisible()
    })

    test('re-enables form after failed submission', async ({ page }) => {
      // Mock API error response
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Request failed' },
          }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Wait for error to appear
      const alert = page.locator('[role="alert"]').filter({ hasText: 'Request failed' })
      await expect(alert).toBeVisible()

      // Form should be re-enabled
      await expect(emailInput).not.toBeDisabled()
      await expect(submitButton).not.toBeDisabled()
    })
  })

  test.describe('Success State', () => {
    test('shows success message after successful submission', async ({ page }) => {
      // Mock successful API response
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Should show success message
      await expect(page.getByText('Check your email')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText("We've sent you a password reset link")).toBeVisible()
    })

    test('hides forgot password form after successful submission', async ({ page }) => {
      // Mock successful API response
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Wait for success state
      await expect(page.getByText('Check your email')).toBeVisible({ timeout: 10000 })

      // Form fields should no longer be visible
      await expect(page.getByLabel(/email/i)).not.toBeVisible()
    })

    test('shows reset instructions after successful submission', async ({ page }) => {
      // Mock successful API response
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Should show instructions about email
      await expect(
        page.getByText(/if an account exists with that email/i)
      ).toBeVisible()
      await expect(page.getByText(/24 hours/i)).toBeVisible()
    })

    test('shows spam folder hint after successful submission', async ({ page }) => {
      // Mock successful API response
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Should show spam folder hint
      await expect(page.getByText(/check your spam folder/i)).toBeVisible()
    })

    test('shows "Back to sign in" button after successful submission', async ({ page }) => {
      // Mock successful API response
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Should show "Back to sign in" button
      const backButton = page.getByRole('link', { name: /back to sign in/i })
      await expect(backButton).toBeVisible()
      await expect(backButton).toHaveAttribute('href', '/login')
    })
  })

  test.describe('Navigation Links', () => {
    test('displays "Remember your password? Sign in" link', async ({ page }) => {
      await expect(page.getByText(/remember your password\?/i)).toBeVisible()
      const signInLink = page.getByRole('link', { name: /sign in/i })
      await expect(signInLink).toBeVisible()
      await expect(signInLink).toHaveAttribute('href', '/login')
    })

    test('navigates to login page when clicking "Sign in" link', async ({ page }) => {
      const signInLink = page.getByRole('link', { name: /sign in/i })

      // Click and wait for navigation
      await Promise.all([page.waitForURL(/\/login/), signInLink.click()])

      // Verify URL changed
      await expect(page).toHaveURL(/\/login/)
    })

    test('"Back to sign in" button navigates to login page after success', async ({ page }) => {
      // Mock successful API response
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Wait for success state
      await expect(page.getByText('Check your email')).toBeVisible({ timeout: 10000 })

      // Click "Back to sign in"
      const backButton = page.getByRole('link', { name: /back to sign in/i })
      await backButton.click()

      // Should navigate to login page
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Accessibility', () => {
    test('email field has proper label', async ({ page }) => {
      await expect(page.getByLabel(/email/i)).toBeVisible()
    })

    test('error messages are announced with alert role', async ({ page }) => {
      // Mock API error
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Test error' },
          }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Error should have alert role for screen readers
      const alert = page.locator('[role="alert"]').filter({ hasText: 'Test error' })
      await expect(alert).toBeVisible()
    })

    test('success message has proper aria-live attribute', async ({ page }) => {
      // Mock successful API response
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // Success content should have aria-live attribute
      const statusRegion = page.locator('[role="status"][aria-live="polite"]')
      await expect(statusRegion).toBeVisible()
    })

    test('form can be submitted with Enter key', async ({ page }) => {
      // Mock successful API response
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)

      await emailInput.fill('test@example.com')

      // Press Enter to submit
      await emailInput.press('Enter')

      // Should show success state
      await expect(page.getByText('Check your email')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Edge Cases', () => {
    test('handles email with leading/trailing whitespace', async ({ page }) => {
      // Mock successful API response - check that trimmed email is sent
      let sentEmail = ''
      await page.route('**/api/auth/reset-password', async (route) => {
        const requestBody = route.request().postDataJSON()
        sentEmail = requestBody.email
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('  test@example.com  ')
      await submitButton.click()

      // Should show success state
      await expect(page.getByText('Check your email')).toBeVisible({ timeout: 10000 })

      // Email should be trimmed
      expect(sentEmail).toBe('test@example.com')
    })

    test('handles very long email address', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i)

      const longEmail = 'a'.repeat(100) + '@example.com'
      await emailInput.fill(longEmail)

      // Should accept the long email
      await expect(emailInput).toHaveValue(longEmail)
    })

    test('prevents double submission during loading', async ({ page }) => {
      let requestCount = 0

      // Mock API response with delay
      await page.route('**/api/auth/reset-password', async (route) => {
        requestCount++
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')

      // Click submit
      await submitButton.click()

      // Wait for button to show loading state
      await expect(page.getByRole('button', { name: /sending/i })).toBeVisible()

      // Request count should be 1 because button is disabled
      expect(requestCount).toBe(1)
    })
  })
})
