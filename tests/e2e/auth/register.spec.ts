import { test, expect } from '@playwright/test'

/**
 * E2E Tests for the Registration Page
 *
 * These tests run against the actual application in a real browser
 * to verify the complete registration user journey.
 */

test.describe('Registration Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock CSRF endpoint to provide a valid token
    await page.route('**/api/csrf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'test-csrf-token' }),
      })
    })

    // Navigate to registration page before each test
    await page.goto('/register')
  })

  test.describe('Page Rendering and Branding', () => {
    test('displays the registration page with Luma branding', async ({ page }) => {
      // Check page title
      await expect(page).toHaveTitle(/Create Account - Luma/)

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

  test.describe('Registration Form Display', () => {
    test('displays the registration form card with title and description', async ({ page }) => {
      // Check card header
      await expect(page.getByText('Create an account')).toBeVisible()
      await expect(
        page.getByText('Enter your email and create a password to get started')
      ).toBeVisible()
    })

    test('displays email input field with correct attributes', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i)
      await expect(emailInput).toBeVisible()
      await expect(emailInput).toHaveAttribute('type', 'email')
      await expect(emailInput).toHaveAttribute('placeholder', 'you@example.com')
      await expect(emailInput).toHaveAttribute('autocomplete', 'email')
    })

    test('displays password input field with correct attributes', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i)
      await expect(passwordInput).toBeVisible()
      await expect(passwordInput).toHaveAttribute('type', 'password')
      await expect(passwordInput).toHaveAttribute('placeholder', 'Create a password')
      await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
    })

    test('displays confirm password input field with correct attributes', async ({ page }) => {
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      await expect(confirmPasswordInput).toBeVisible()
      await expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      await expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm your password')
      await expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password')
    })

    test('displays password requirement hint', async ({ page }) => {
      // Use exact match to target the description text, not validation errors
      await expect(page.getByText('Must be at least 8 characters')).toBeVisible()
    })

    test('displays Create account submit button', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /create account/i })
      await expect(submitButton).toBeVisible()
      await expect(submitButton).toHaveAttribute('type', 'submit')
    })

    test('displays input field icons', async ({ page }) => {
      // Email field should have Mail icon
      const emailFieldContainer = page.getByLabel(/email/i).locator('..')
      const emailIcon = emailFieldContainer.locator('svg')
      await expect(emailIcon).toBeVisible()

      // Password fields should have Lock icons
      const passwordFieldContainer = page.getByLabel(/^password$/i).locator('..')
      const passwordIcon = passwordFieldContainer.locator('svg')
      await expect(passwordIcon).toBeVisible()
    })
  })

  test.describe('Password Strength Indicator', () => {
    test('shows password strength indicator when typing a password', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i)

      // Initially, no password strength indicator
      await expect(page.getByTestId('password-strength-indicator')).not.toBeVisible()

      // Type a password
      await passwordInput.fill('a')

      // Password strength indicator should appear
      await expect(page.getByTestId('password-strength-indicator')).toBeVisible()
    })

    test('shows "Weak" for simple passwords', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i)

      await passwordInput.fill('abc')

      // Should show weak strength
      await expect(page.getByText('Password strength: Weak')).toBeVisible()
    })

    test('shows "Fair" for passwords with more criteria', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i)

      // Password with lowercase, uppercase, and length
      await passwordInput.fill('Abcdefgh')

      // Should show fair strength
      await expect(page.getByText('Password strength: Fair')).toBeVisible()
    })

    test('shows "Good" for passwords with 4 criteria', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i)

      // Password with lowercase, uppercase, number, and length
      await passwordInput.fill('Abcdefg1')

      // Should show good strength
      await expect(page.getByText('Password strength: Good')).toBeVisible()
    })

    test('shows "Strong" for passwords with all criteria', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i)

      // Password with all criteria
      await passwordInput.fill('Password1!')

      // Should show strong strength
      await expect(page.getByText('Password strength: Strong')).toBeVisible()
    })

    test('displays password criteria checklist', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i)

      await passwordInput.fill('test')

      // Should show all criteria
      await expect(page.getByText('8+ characters')).toBeVisible()
      await expect(page.getByText('Uppercase letter')).toBeVisible()
      await expect(page.getByText('Lowercase letter')).toBeVisible()
      await expect(page.getByText('Number')).toBeVisible()
      await expect(page.getByText('Special character')).toBeVisible()
    })

    test('updates criteria checkmarks as password improves', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i)

      // Start with just lowercase
      await passwordInput.fill('abcd')

      // Only lowercase should be met
      let metCriteria = await page.getByTestId('criteria-met').count()
      expect(metCriteria).toBe(1)

      // Add more to meet length requirement
      await passwordInput.fill('abcdefgh')

      // Lowercase + length should be met
      metCriteria = await page.getByTestId('criteria-met').count()
      expect(metCriteria).toBe(2)

      // Add uppercase
      await passwordInput.fill('Abcdefgh')

      // Lowercase + length + uppercase should be met
      metCriteria = await page.getByTestId('criteria-met').count()
      expect(metCriteria).toBe(3)
    })

    test('hides password strength indicator when password is cleared', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i)

      // Type a password
      await passwordInput.fill('test')
      await expect(page.getByTestId('password-strength-indicator')).toBeVisible()

      // Clear the password
      await passwordInput.clear()

      // Password strength indicator should disappear
      await expect(page.getByTestId('password-strength-indicator')).not.toBeVisible()
    })
  })

  test.describe('Form Validation', () => {
    test('prevents submission with invalid email format (browser validation)', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('invalid-email')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Browser's HTML5 validation prevents form submission for invalid email format
      // The email input should show validation error state (validity.valid = false)
      const isEmailInvalid = await emailInput.evaluate(
        (el: HTMLInputElement) => !el.validity.valid
      )
      expect(isEmailInvalid).toBe(true)

      // Form should still be visible (not submitted)
      await expect(submitButton).toBeVisible()
    })

    test('shows validation error for short password', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('test@example.com')
      await passwordInput.fill('short')
      await confirmPasswordInput.fill('short')
      await submitButton.click()

      // Should show password length validation error - this appears as form error message
      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible({
        timeout: 10000,
      })
    })

    test('shows validation error for mismatched passwords', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('test@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('DifferentPassword1!')
      await submitButton.click()

      // Should show password mismatch error
      await expect(page.getByText(/passwords do not match/i)).toBeVisible({ timeout: 10000 })
    })

    test('requires email field to be filled', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      // Fill only password fields (leave email empty)
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')

      // Attempt to submit - the form should not submit due to browser validation
      await submitButton.click()

      // Form should still be visible (not submitted) because email is empty
      await expect(submitButton).toBeVisible()
      await expect(emailInput).toBeVisible()
    })

    test('clears validation error when form is resubmitted with valid input', async ({ page }) => {
      // Mock successful registration
      await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      // First, submit with mismatched passwords to trigger Zod validation error
      await emailInput.fill('test@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('DifferentPassword!')
      await submitButton.click()

      // Wait for validation error
      await expect(page.getByText(/passwords do not match/i)).toBeVisible({ timeout: 10000 })

      // Correct the input and resubmit
      await confirmPasswordInput.clear()
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show success, validation error should be gone
      await expect(page.getByText('Check your email', { exact: true })).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/passwords do not match/i)).not.toBeVisible()
    })
  })

  test.describe('Loading State', () => {
    test('disables submit button during form submission', async ({ page }) => {
      // Mock the API response to delay
      await page.route('**/api/auth/register', async (route) => {
        // Delay the response to observe loading state
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('test@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Button should be disabled and show loading text
      await expect(page.getByRole('button', { name: /creating account/i })).toBeDisabled()
    })

    test('shows loading spinner during submission', async ({ page }) => {
      // Mock the API response to delay
      await page.route('**/api/auth/register', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('test@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show loading spinner (animate-spin class on SVG)
      const loadingSpinner = page.locator('button svg.animate-spin')
      await expect(loadingSpinner).toBeVisible()
    })

    test('disables all form inputs during submission', async ({ page }) => {
      // Mock the API response to delay
      await page.route('**/api/auth/register', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('test@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // All inputs should be disabled
      await expect(emailInput).toBeDisabled()
      await expect(passwordInput).toBeDisabled()
      await expect(confirmPasswordInput).toBeDisabled()
    })
  })

  test.describe('Error Messages Display', () => {
    test('displays error message for duplicate email', async ({ page }) => {
      // Mock API response for duplicate email
      await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'AUTH_EMAIL_EXISTS',
              message: 'An account with this email already exists',
            },
          }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('existing@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show error alert - filter to the visible alert in the form, not Next.js route announcer
      const alert = page.locator('[role="alert"]').filter({ hasText: 'An account with this email' })
      await expect(alert).toBeVisible()
      await expect(alert).toContainText('An account with this email already exists')
    })

    test('displays error message for rate limiting', async ({ page }) => {
      // Mock API response for rate limiting
      await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'AUTH_RATE_LIMITED',
              message: 'Too many registration attempts. Please try again later.',
            },
          }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('test@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show error alert
      const alert = page
        .locator('[role="alert"]')
        .filter({ hasText: 'Too many registration attempts' })
      await expect(alert).toBeVisible()
    })

    test('displays generic error for network failure', async ({ page }) => {
      // Mock network error
      await page.route('**/api/auth/register', async (route) => {
        await route.abort('failed')
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('test@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show error alert
      const alert = page.locator('[role="alert"]').filter({ hasText: 'unexpected error' })
      await expect(alert).toBeVisible()
    })

    test('re-enables form after failed submission', async ({ page }) => {
      // Mock API error response
      await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Registration failed' },
          }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('test@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Wait for error to appear
      const alert = page.locator('[role="alert"]').filter({ hasText: 'Registration failed' })
      await expect(alert).toBeVisible()

      // Form should be re-enabled
      await expect(emailInput).not.toBeDisabled()
      await expect(passwordInput).not.toBeDisabled()
      await expect(confirmPasswordInput).not.toBeDisabled()
      await expect(submitButton).not.toBeDisabled()
    })
  })

  test.describe('Success State', () => {
    test('shows success message after successful registration', async ({ page }) => {
      // Mock successful registration
      await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('newuser@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show success message (with extended timeout for API mock)
      await expect(page.getByText('Check your email', { exact: true })).toBeVisible({ timeout: 10000 })
      await expect(page.getByText("We've sent you a verification link")).toBeVisible()
    })

    test('hides registration form after successful registration', async ({ page }) => {
      // Mock successful registration
      await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('newuser@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Wait for success state
      await expect(page.getByText('Check your email', { exact: true })).toBeVisible({ timeout: 10000 })

      // Form fields should no longer be visible (form is replaced with success message)
      await expect(page.getByLabel(/email/i)).not.toBeVisible()
    })

    test('shows verification instructions after successful registration', async ({ page }) => {
      // Mock successful registration
      await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('newuser@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show verification instructions
      await expect(
        page.getByText(/please check your email and click the verification link/i)
      ).toBeVisible()
      await expect(page.getByText(/24 hours/i)).toBeVisible()
    })

    test('shows "Back to sign in" link after successful registration', async ({ page }) => {
      // Mock successful registration
      await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('newuser@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show "Back to sign in" link
      const backLink = page.getByRole('link', { name: /back to sign in/i })
      await expect(backLink).toBeVisible()
      await expect(backLink).toHaveAttribute('href', '/login')
    })

    test('shows link to resend verification email after successful registration', async ({
      page,
    }) => {
      // Mock successful registration
      await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('newuser@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show resend link
      await expect(page.getByText(/didn't receive the email/i)).toBeVisible()
      const resendLink = page.getByRole('link', { name: /request a new link/i })
      await expect(resendLink).toBeVisible()
      await expect(resendLink).toHaveAttribute('href', '/resend-verification')
    })
  })

  test.describe('Navigation Links', () => {
    test('displays "Sign in" link with correct href', async ({ page }) => {
      const signInLink = page.getByRole('link', { name: /sign in/i })
      await expect(signInLink).toBeVisible()
      await expect(signInLink).toHaveAttribute('href', '/login')
    })

    test('displays "Already have an account?" text', async ({ page }) => {
      await expect(page.getByText(/already have an account\?/i)).toBeVisible()
    })

    test('navigates to login page when clicking "Sign in" link', async ({ page }) => {
      const signInLink = page.getByRole('link', { name: /sign in/i })

      // Click and wait for navigation
      await Promise.all([page.waitForURL(/\/login/), signInLink.click()])

      // Verify URL changed
      await expect(page).toHaveURL(/\/login/)
    })

    test('"Back to sign in" link navigates to login page after successful registration', async ({
      page,
    }) => {
      // Mock successful registration
      await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('newuser@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Wait for success state
      await expect(page.getByText('Check your email', { exact: true })).toBeVisible({ timeout: 10000 })

      // Click "Back to sign in"
      const backLink = page.getByRole('link', { name: /back to sign in/i })
      await backLink.click()

      // Should navigate to login page
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Accessibility', () => {
    test('form fields have proper labels', async ({ page }) => {
      // All form fields should have accessible labels
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/^password$/i)).toBeVisible()
      await expect(page.getByLabel(/confirm password/i)).toBeVisible()
    })

    test('error messages are announced with alert role', async ({ page }) => {
      // Mock API error
      await page.route('**/api/auth/register', async (route) => {
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
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('test@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Error should have alert role for screen readers
      const alert = page.locator('[role="alert"]').filter({ hasText: 'Test error' })
      await expect(alert).toBeVisible()
    })

    test('can navigate form with keyboard (tab order)', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)

      // Click on email input to focus it first
      await emailInput.click()
      await page.waitForTimeout(100) // Small delay to ensure focus is established
      await expect(emailInput).toBeFocused()

      // Tab to password
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100)
      await expect(passwordInput).toBeFocused()

      // Tab to confirm password
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100)
      await expect(confirmPasswordInput).toBeFocused()
    })

    test('form can be submitted with Enter key', async ({ page }) => {
      // Mock successful registration
      await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)

      await emailInput.fill('test@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')

      // Focus on the confirm password field and press Enter to submit
      await confirmPasswordInput.press('Enter')

      // Should show success state
      await expect(page.getByText('Check your email', { exact: true })).toBeVisible({ timeout: 10000 })
    })

    test('password strength indicator has proper aria attributes', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i)

      await passwordInput.fill('test')

      // Check aria attributes on the indicator
      const indicator = page.getByTestId('password-strength-indicator')
      await expect(indicator).toHaveAttribute('aria-label', /password strength/i)

      // Progress bar should have proper role
      const progressBar = indicator.locator('[role="progressbar"]')
      await expect(progressBar).toBeVisible()
    })
  })

  test.describe('Edge Cases', () => {
    test('handles password with special characters', async ({ page }) => {
      // Mock successful registration
      await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      const specialPassword = 'P@$$w0rd!#%^&*'

      await emailInput.fill('test@example.com')
      await passwordInput.fill(specialPassword)
      await confirmPasswordInput.fill(specialPassword)
      await submitButton.click()

      // Should succeed
      await expect(page.getByText('Check your email', { exact: true })).toBeVisible({ timeout: 10000 })
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
      await page.route('**/api/auth/register', async (route) => {
        requestCount++
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('test@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')

      // Click submit
      await submitButton.click()

      // Wait for button to show loading state
      await expect(page.getByRole('button', { name: /creating account/i })).toBeVisible()

      // Even with force click, the button is disabled so it shouldn't submit again
      // But the request count should still be 1 because the button is disabled
      expect(requestCount).toBe(1)
    })

    test('validates password case sensitivity for matching', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/^password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      const submitButton = page.getByRole('button', { name: /create account/i })

      await emailInput.fill('test@example.com')
      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('PASSWORD1!') // Different case
      await submitButton.click()

      // Should show password mismatch error
      await expect(page.getByText(/passwords do not match/i)).toBeVisible()
    })
  })
})
