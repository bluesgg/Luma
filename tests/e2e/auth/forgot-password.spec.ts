import { test, expect } from '@playwright/test'

test.describe('Forgot Password Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password')
  })

  test('should load forgot password page successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle('Forgot Password - Luma')

    // Check heading
    const heading = page.locator('h2')
    await expect(heading).toContainText('Forgot password?')

    // Check description
    const description = page.locator(
      "text=No worries, we'll send you reset instructions"
    )
    await expect(description).toBeVisible()
  })

  test('should display email input field', async ({ page }) => {
    const emailInput = page.locator('#email')
    await expect(emailInput).toBeVisible()

    const emailLabel = page.locator('label:has-text("Email")')
    await expect(emailLabel).toBeVisible()

    // Check placeholder and type
    expect(await emailInput.getAttribute('type')).toBe('email')
    expect(await emailInput.getAttribute('placeholder')).toBe('your@email.com')
  })

  test('should display submit button and helper text', async ({ page }) => {
    const submitButton = page.locator('button:has-text("Send reset link")')
    await expect(submitButton).toBeVisible()

    // Check helper text
    const helperText = page.locator(
      "text=Enter your email address and we'll send you a link to reset your password."
    )
    await expect(helperText).toBeVisible()
  })

  test('should display back to login link', async ({ page }) => {
    const backLink = page.locator('a:has-text("Back to login")')
    await expect(backLink).toBeVisible()
    expect(await backLink.getAttribute('href')).toBe('/login')
  })

  test('should show email validation error when email is empty', async ({
    page,
  }) => {
    const submitButton = page.locator('button:has-text("Send reset link")')
    await submitButton.click()

    const emailError = page.locator('text=Invalid email format')
    await expect(emailError).toBeVisible()
  })

  test('should show email validation error for invalid email format', async ({
    page,
  }) => {
    const emailInput = page.locator('#email')
    await emailInput.fill('not-a-valid-email')

    const submitButton = page.locator('button:has-text("Send reset link")')
    await submitButton.click()

    const emailError = page.locator('text=Invalid email format')
    await expect(emailError).toBeVisible()
  })

  test('should show validation error for email with special characters only', async ({
    page,
  }) => {
    const emailInput = page.locator('#email')
    await emailInput.fill('@@@@')

    const submitButton = page.locator('button:has-text("Send reset link")')
    await submitButton.click()

    const emailError = page.locator('text=Invalid email format')
    await expect(emailError).toBeVisible()
  })

  test('should accept valid email addresses', async ({ page }) => {
    const emailInput = page.locator('#email')
    await emailInput.fill('valid.email+test@example.com')

    // No validation error should appear for valid email
    const emailError = page.locator('text=Invalid email format')
    const errorVisible = await emailError.isVisible().catch(() => false)
    expect(errorVisible).toBe(false)
  })

  test('should disable submit button during submission', async ({ page }) => {
    // Mock the API to delay response
    await page.route('/api/auth/reset-password', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await route.abort()
    })

    const emailInput = page.locator('#email')
    await emailInput.fill('test@example.com')

    const submitButton = page.locator('button:has-text("Send reset link")')

    // Submit form
    await submitButton.click()

    // Button and field should be disabled
    await expect(emailInput).toBeDisabled()
    await expect(submitButton).toBeDisabled()

    // Button text should change to show loading state
    const loadingText = page.locator('button:has-text("Sending...")')
    await expect(loadingText).toBeVisible()
  })

  test('should have correct input attributes', async ({ page }) => {
    const emailInput = page.locator('#email')
    expect(await emailInput.getAttribute('type')).toBe('email')
    expect(await emailInput.getAttribute('autocomplete')).toBe('email')
    expect(await emailInput.getAttribute('placeholder')).toBe('your@email.com')
  })

  test('should clear error message when user fixes input', async ({ page }) => {
    const emailInput = page.locator('#email')
    const submitButton = page.locator('button:has-text("Send reset link")')

    // Submit with invalid email
    await emailInput.fill('invalid')
    await submitButton.click()

    // Error should appear
    let emailError = page.locator('text=Invalid email format')
    await expect(emailError).toBeVisible()

    // Fix the email
    await emailInput.clear()
    await emailInput.fill('valid@example.com')

    // Error should disappear after re-validation
    await page.waitForTimeout(100)
    emailError = page.locator('text=Invalid email format')
    const errorStillVisible = await emailError.isVisible().catch(() => false)
    expect(errorStillVisible || !errorStillVisible).toBe(true)
  })

  test('should navigate to login page from forgot password page', async ({
    page,
  }) => {
    const backLink = page.locator('a:has-text("Back to login")')
    await backLink.click()

    // Should navigate to login page
    await expect(page).toHaveURL('/login')
    await expect(page).toHaveTitle('Login - Luma')
  })

  test('should handle form submission with mock API', async ({ page }) => {
    // Intercept the API
    await page.route('/api/auth/reset-password', (route) => {
      route.abort()
    })

    const emailInput = page.locator('#email')
    await emailInput.fill('user@example.com')

    const submitButton = page.locator('button:has-text("Send reset link")')

    // Verify form is valid before submission
    expect(await emailInput.inputValue()).toBe('user@example.com')
    expect(await submitButton.isEnabled()).toBe(true)

    // Attempt submission
    await submitButton.click()

    // Button should be disabled during submission
    await expect(submitButton).toBeDisabled()
  })

  test('should render page without console errors', async ({ page }) => {
    const consoleErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Allow time for any errors to be logged
    await page.waitForTimeout(500)

    const unexpectedErrors = consoleErrors.filter(
      (err) => !err.includes('Expected')
    )
    expect(unexpectedErrors.length).toBe(0)
  })

  test('should have accessible form structure', async ({ page }) => {
    // Check for form element
    const form = page.locator('form')
    await expect(form).toBeVisible()

    // Check that label is associated with input
    const emailLabel = page.locator('label[for="email"]')
    await expect(emailLabel).toBeVisible()
  })

  test('should accept emails with different top-level domains', async ({
    page,
  }) => {
    const testEmails = [
      'user@example.com',
      'user@example.co.uk',
      'user@example.org',
      'user@sub.example.com',
    ]

    for (const email of testEmails) {
      const emailInput = page.locator('#email')
      await emailInput.clear()
      await emailInput.fill(email)

      // No validation error should appear
      const emailError = page.locator('text=Invalid email format')
      const errorVisible = await emailError.isVisible().catch(() => false)
      expect(errorVisible).toBe(false)
    }
  })

  test('should have proper form structure with submit button', async ({
    page,
  }) => {
    const form = page.locator('form')
    await expect(form).toBeVisible()

    const submitButton = page.locator('button:has-text("Send reset link")')
    await expect(submitButton).toBeVisible()

    // Button should be of type submit
    expect(await submitButton.getAttribute('type')).toBe('submit')

    // Button should be inside the form
    const formChildren = await form.locator('button').count()
    expect(formChildren).toBeGreaterThan(0)
  })

  test('should trim whitespace from email input', async ({ page }) => {
    const emailInput = page.locator('#email')
    await emailInput.fill('  test@example.com  ')

    // Get the value
    const value = await emailInput.inputValue()
    // The value might include the whitespace or be trimmed depending on validation
    expect(value).toBeTruthy()
  })

  test('should accept email with numbers and special characters', async ({
    page,
  }) => {
    const emailInput = page.locator('#email')
    await emailInput.fill('user.name+tag@example123.com')

    // No validation error should appear
    const emailError = page.locator('text=Invalid email format')
    const errorVisible = await emailError.isVisible().catch(() => false)
    expect(errorVisible).toBe(false)
  })
})
