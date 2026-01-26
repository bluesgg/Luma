import { test, expect } from '@playwright/test'

/**
 * E2E Tests for the Reset Password Page
 *
 * These tests run against the actual application in a real browser
 * to verify the complete password reset user journey.
 */

test.describe('Reset Password Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock CSRF endpoint to provide a valid token
    await page.route('**/api/csrf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'test-csrf-token' }),
      })
    })
  })

  test.describe('Page Rendering and Branding', () => {
    test('displays the reset password page with Luma branding', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Check page title
      await expect(page).toHaveTitle(/Reset Password - Luma/)

      // Check Luma brand name is visible
      const brandName = page.locator('text=Luma').first()
      await expect(brandName).toBeVisible()

      // Check tagline is visible
      await expect(page.getByText('AI-Powered PDF Learning Assistant')).toBeVisible()
    })

    test('displays the BookOpen logo icon', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // The BookOpen icon should be visible next to the brand name
      const brandContainer = page.locator('.mb-8.flex.items-center.gap-2')
      await expect(brandContainer).toBeVisible()

      // Check SVG icon exists with indigo color
      const logoIcon = brandContainer.locator('svg')
      await expect(logoIcon).toBeVisible()
      await expect(logoIcon).toHaveClass(/text-indigo-600/)
    })

    test('has correct page layout and background', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Check main container has correct styling
      const mainContainer = page.locator('div.flex.min-h-screen')
      await expect(mainContainer).toBeVisible()
      await expect(mainContainer).toHaveClass(/bg-slate-50/)
    })
  })

  test.describe('Invalid/Missing Token State', () => {
    test('shows error when token is missing', async ({ page }) => {
      await page.goto('/reset-password')

      // Should show invalid link card
      await expect(page.getByText('Invalid link')).toBeVisible()
      await expect(
        page.getByText('The password reset link is invalid or has expired')
      ).toBeVisible()
    })

    test('shows error alert when token is missing', async ({ page }) => {
      await page.goto('/reset-password')

      // Should show error alert - filter to exclude Next.js route announcer
      const alert = page.locator('[role="alert"]').filter({ hasText: 'Invalid or missing reset token' })
      await expect(alert).toBeVisible()
      await expect(alert).toContainText('Invalid or missing reset token')
      await expect(alert).toContainText('Please request a new password reset link')
    })

    test('shows "Request new link" button when token is missing', async ({ page }) => {
      await page.goto('/reset-password')

      const requestNewLinkButton = page.getByRole('link', { name: /request new link/i })
      await expect(requestNewLinkButton).toBeVisible()
      await expect(requestNewLinkButton).toHaveAttribute('href', '/forgot-password')
    })

    test('shows "Back to sign in" link when token is missing', async ({ page }) => {
      await page.goto('/reset-password')

      const backToSignInLink = page.getByRole('link', { name: /back to sign in/i })
      await expect(backToSignInLink).toBeVisible()
      await expect(backToSignInLink).toHaveAttribute('href', '/login')
    })

    test('navigates to forgot-password page when clicking "Request new link"', async ({ page }) => {
      await page.goto('/reset-password')

      const requestNewLinkButton = page.getByRole('link', { name: /request new link/i })
      await requestNewLinkButton.click()

      await expect(page).toHaveURL(/\/forgot-password/)
    })

    test('navigates to login page when clicking "Back to sign in"', async ({ page }) => {
      await page.goto('/reset-password')

      const backToSignInLink = page.getByRole('link', { name: /back to sign in/i })
      await backToSignInLink.click()

      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Reset Password Form Display', () => {
    test('displays the reset password form card with title and description', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Check card header
      await expect(page.getByText('Reset password')).toBeVisible()
      await expect(page.getByText('Enter your new password below')).toBeVisible()
    })

    test('displays new password input field with correct attributes', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const passwordInput = page.getByLabel(/^new password$/i)
      await expect(passwordInput).toBeVisible()
      await expect(passwordInput).toHaveAttribute('type', 'password')
      await expect(passwordInput).toHaveAttribute('placeholder', 'Enter your new password')
      await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
    })

    test('displays confirm password input field with correct attributes', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      await expect(confirmPasswordInput).toBeVisible()
      await expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      await expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm your new password')
      await expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password')
    })

    test('displays password requirement hint', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      await expect(page.getByText('Must be at least 8 characters')).toBeVisible()
    })

    test('displays Reset password submit button', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const submitButton = page.getByRole('button', { name: /reset password/i })
      await expect(submitButton).toBeVisible()
      await expect(submitButton).toHaveAttribute('type', 'submit')
    })

    test('displays password input field icons', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Password fields should have Lock icons
      const passwordFieldContainer = page.getByLabel(/^new password$/i).locator('..')
      const passwordIcon = passwordFieldContainer.locator('svg')
      await expect(passwordIcon).toBeVisible()

      const confirmPasswordFieldContainer = page.getByLabel(/confirm new password/i).locator('..')
      const confirmPasswordIcon = confirmPasswordFieldContainer.locator('svg')
      await expect(confirmPasswordIcon).toBeVisible()
    })
  })

  test.describe('Password Strength Indicator', () => {
    test('shows password strength indicator when typing a password', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const passwordInput = page.getByLabel(/^new password$/i)

      // Initially, no password strength indicator
      await expect(page.getByTestId('password-strength-indicator')).not.toBeVisible()

      // Type a password
      await passwordInput.fill('a')

      // Password strength indicator should appear
      await expect(page.getByTestId('password-strength-indicator')).toBeVisible()
    })

    test('shows "Weak" for simple passwords', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const passwordInput = page.getByLabel(/^new password$/i)
      await passwordInput.fill('abc')

      // Should show weak strength
      await expect(page.getByText('Password strength: Weak')).toBeVisible()
    })

    test('shows "Fair" for passwords with more criteria', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const passwordInput = page.getByLabel(/^new password$/i)

      // Password with lowercase, uppercase, and length
      await passwordInput.fill('Abcdefgh')

      // Should show fair strength
      await expect(page.getByText('Password strength: Fair')).toBeVisible()
    })

    test('shows "Good" for passwords with 4 criteria', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const passwordInput = page.getByLabel(/^new password$/i)

      // Password with lowercase, uppercase, number, and length
      await passwordInput.fill('Abcdefg1')

      // Should show good strength
      await expect(page.getByText('Password strength: Good')).toBeVisible()
    })

    test('shows "Strong" for passwords with all criteria', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const passwordInput = page.getByLabel(/^new password$/i)

      // Password with all criteria
      await passwordInput.fill('Password1!')

      // Should show strong strength
      await expect(page.getByText('Password strength: Strong')).toBeVisible()
    })

    test('displays password criteria checklist', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const passwordInput = page.getByLabel(/^new password$/i)
      await passwordInput.fill('test')

      // Should show all criteria
      await expect(page.getByText('8+ characters')).toBeVisible()
      await expect(page.getByText('Uppercase letter')).toBeVisible()
      await expect(page.getByText('Lowercase letter')).toBeVisible()
      await expect(page.getByText('Number')).toBeVisible()
      await expect(page.getByText('Special character')).toBeVisible()
    })

    test('hides password strength indicator when password is cleared', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const passwordInput = page.getByLabel(/^new password$/i)

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
    test('shows validation error for short password', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('short')
      await confirmPasswordInput.fill('short')
      await submitButton.click()

      // Should show password length validation error
      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible({
        timeout: 10000,
      })
    })

    test('shows validation error for mismatched passwords', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('DifferentPassword1!')
      await submitButton.click()

      // Should show password mismatch error
      await expect(page.getByText(/passwords do not match/i)).toBeVisible({ timeout: 10000 })
    })

    test('requires password fields to be filled', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const submitButton = page.getByRole('button', { name: /reset password/i })

      // Attempt to submit with empty fields
      await submitButton.click()

      // Form should still be visible (not submitted)
      await expect(submitButton).toBeVisible()
    })

    test('clears validation error when form is resubmitted with valid input', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock successful API response
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      // First, submit with mismatched passwords to trigger validation error
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
      await expect(page.getByText('Password updated')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/passwords do not match/i)).not.toBeVisible()
    })
  })

  test.describe('Loading State', () => {
    test('disables submit button during form submission', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock the API response to delay
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Button should be disabled and show loading text
      await expect(page.getByRole('button', { name: /resetting/i })).toBeDisabled()
    })

    test('shows loading spinner during submission', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock the API response to delay
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show loading spinner
      const loadingSpinner = page.locator('button svg.animate-spin')
      await expect(loadingSpinner).toBeVisible()
    })

    test('disables all form inputs during submission', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock the API response to delay
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // All inputs should be disabled
      await expect(passwordInput).toBeDisabled()
      await expect(confirmPasswordInput).toBeDisabled()
    })
  })

  test.describe('Error Messages Display', () => {
    test('displays error for expired/invalid token', async ({ page }) => {
      await page.goto('/reset-password?token=expired-token')

      // Mock API response for expired token
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'AUTH_TOKEN_EXPIRED',
              message: 'Reset token has expired. Please request a new one.',
            },
          }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show error alert
      const alert = page.locator('[role="alert"]').filter({ hasText: 'Reset token has expired' })
      await expect(alert).toBeVisible()
    })

    test('shows "Request a new link" link when token is expired', async ({ page }) => {
      await page.goto('/reset-password?token=expired-token')

      // Mock API response for expired token
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              message: 'Reset token has expired. Please request a new one.',
            },
          }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show "Request a new link" link in error message
      const requestNewLinkInError = page.locator('[role="alert"]').getByRole('link', { name: /request a new link/i })
      await expect(requestNewLinkInError).toBeVisible()
      await expect(requestNewLinkInError).toHaveAttribute('href', '/forgot-password')
    })

    test('displays error for invalid token', async ({ page }) => {
      await page.goto('/reset-password?token=invalid-token')

      // Mock API response for invalid token
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'AUTH_TOKEN_INVALID',
              message: 'Invalid reset token. Please request a new password reset link.',
            },
          }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show error alert
      const alert = page.locator('[role="alert"]').filter({ hasText: 'Invalid reset token' })
      await expect(alert).toBeVisible()
    })

    test('displays generic error for network failure', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock network error
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.abort('failed')
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show error alert
      const alert = page.locator('[role="alert"]').filter({ hasText: 'unexpected error' })
      await expect(alert).toBeVisible()
    })

    test('re-enables form after failed submission', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock API error response
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Request failed' },
          }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Wait for error to appear
      const alert = page.locator('[role="alert"]').filter({ hasText: 'Request failed' })
      await expect(alert).toBeVisible()

      // Form should be re-enabled
      await expect(passwordInput).not.toBeDisabled()
      await expect(confirmPasswordInput).not.toBeDisabled()
      await expect(submitButton).not.toBeDisabled()
    })
  })

  test.describe('Success State', () => {
    test('shows success message after successful password reset', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock successful API response
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show success message
      await expect(page.getByText('Password updated')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Your password has been successfully reset')).toBeVisible()
    })

    test('shows success icon after successful password reset', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock successful API response
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Wait for success state
      await expect(page.getByText('Password updated')).toBeVisible({ timeout: 10000 })

      // Check for success icon (green checkmark)
      const successIcon = page.locator('.bg-green-100 svg.text-green-600')
      await expect(successIcon).toBeVisible()
    })

    test('hides password form after successful reset', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock successful API response
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Wait for success state
      await expect(page.getByText('Password updated')).toBeVisible({ timeout: 10000 })

      // Form fields should no longer be visible
      await expect(page.getByLabel(/^new password$/i)).not.toBeVisible()
      await expect(page.getByLabel(/confirm new password/i)).not.toBeVisible()
    })

    test('shows countdown redirect message after successful reset', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock successful API response
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Should show countdown message
      await expect(page.getByText(/redirecting to login in \d+ seconds/i)).toBeVisible({ timeout: 10000 })
    })

    test('shows "Continue to sign in" button after successful reset', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock successful API response
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Wait for success state
      await expect(page.getByText('Password updated')).toBeVisible({ timeout: 10000 })

      // Should show "Continue to sign in" button
      const continueButton = page.getByRole('link', { name: /continue to sign in/i })
      await expect(continueButton).toBeVisible()
      await expect(continueButton).toHaveAttribute('href', '/login')
    })

    test('automatically redirects to login after countdown', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock successful API response
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Wait for success state
      await expect(page.getByText('Password updated')).toBeVisible({ timeout: 10000 })

      // Wait for automatic redirect (countdown is 3 seconds)
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
    })

    test('manual navigation to login works via "Continue to sign in" button', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock successful API response
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Wait for success state
      await expect(page.getByText('Password updated')).toBeVisible({ timeout: 10000 })

      // Click "Continue to sign in" before countdown finishes
      const continueButton = page.getByRole('link', { name: /continue to sign in/i })
      await continueButton.click()

      // Should navigate to login page
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Navigation Links', () => {
    test('displays "Remember your password? Sign in" link', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      await expect(page.getByText(/remember your password\?/i)).toBeVisible()
      const signInLink = page.getByRole('link', { name: /sign in/i })
      await expect(signInLink).toBeVisible()
      await expect(signInLink).toHaveAttribute('href', '/login')
    })

    test('navigates to login page when clicking "Sign in" link', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const signInLink = page.getByRole('link', { name: /sign in/i })
      await signInLink.click()

      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Accessibility', () => {
    test('form fields have proper labels', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      await expect(page.getByLabel(/^new password$/i)).toBeVisible()
      await expect(page.getByLabel(/confirm new password/i)).toBeVisible()
    })

    test('error messages are announced with alert role', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock API error
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Test error' },
          }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Error should have alert role for screen readers
      const alert = page.locator('[role="alert"]').filter({ hasText: 'Test error' })
      await expect(alert).toBeVisible()
    })

    test('success message has proper aria-live attribute', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock successful API response
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Success content should have aria-live attribute
      const statusRegion = page.locator('[role="status"][aria-live="polite"]')
      await expect(statusRegion).toBeVisible()
    })

    test('can navigate form with keyboard (tab order)', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)

      // Click on password input to focus it first
      await passwordInput.click()
      await page.waitForTimeout(100)
      await expect(passwordInput).toBeFocused()

      // Tab to confirm password
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100)
      await expect(confirmPasswordInput).toBeFocused()
    })

    test('form can be submitted with Enter key', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      // Mock successful API response
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')

      // Press Enter to submit
      await confirmPasswordInput.press('Enter')

      // Should show success state
      await expect(page.getByText('Password updated')).toBeVisible({ timeout: 10000 })
    })

    test('password strength indicator has proper aria attributes', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const passwordInput = page.getByLabel(/^new password$/i)
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
      await page.goto('/reset-password?token=valid-test-token')

      // Mock successful API response
      await page.route('**/api/auth/confirm-reset', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      const specialPassword = 'P@$$w0rd!#%^&*'

      await passwordInput.fill(specialPassword)
      await confirmPasswordInput.fill(specialPassword)
      await submitButton.click()

      // Should succeed
      await expect(page.getByText('Password updated')).toBeVisible({ timeout: 10000 })
    })

    test('validates password case sensitivity for matching', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('PASSWORD1!') // Different case
      await submitButton.click()

      // Should show password mismatch error
      await expect(page.getByText(/passwords do not match/i)).toBeVisible()
    })

    test('prevents double submission during loading', async ({ page }) => {
      await page.goto('/reset-password?token=valid-test-token')

      let requestCount = 0

      // Mock API response with delay
      await page.route('**/api/auth/confirm-reset', async (route) => {
        requestCount++
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')

      // Click submit
      await submitButton.click()

      // Wait for button to show loading state
      await expect(page.getByRole('button', { name: /resetting/i })).toBeVisible()

      // Request count should be 1 because button is disabled
      expect(requestCount).toBe(1)
    })

    test('sends token to API correctly', async ({ page }) => {
      const testToken = 'my-special-test-token-12345'
      await page.goto(`/reset-password?token=${testToken}`)

      let sentToken = ''

      // Mock API response and capture the token
      await page.route('**/api/auth/confirm-reset', async (route) => {
        const requestBody = route.request().postDataJSON()
        sentToken = requestBody.token
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })

      const passwordInput = page.getByLabel(/^new password$/i)
      const confirmPasswordInput = page.getByLabel(/confirm new password/i)
      const submitButton = page.getByRole('button', { name: /reset password/i })

      await passwordInput.fill('Password1!')
      await confirmPasswordInput.fill('Password1!')
      await submitButton.click()

      // Wait for success state
      await expect(page.getByText('Password updated')).toBeVisible({ timeout: 10000 })

      // Verify the token was sent correctly
      expect(sentToken).toBe(testToken)
    })
  })
})
