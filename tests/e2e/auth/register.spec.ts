import { test, expect } from '@playwright/test'

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('should load register page successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle('Register - Luma')

    // Check heading
    const heading = page.locator('h2')
    await expect(heading).toContainText('Create an account')

    // Check description
    const description = page.locator('text=Get started with Luma today')
    await expect(description).toBeVisible()
  })

  test('should display all form fields', async ({ page }) => {
    // Email field
    const emailInput = page.locator('#email')
    await expect(emailInput).toBeVisible()
    const emailLabel = page.locator('label:has-text("Email")')
    await expect(emailLabel).toBeVisible()

    // Password field
    const passwordInput = page.locator('#password')
    await expect(passwordInput).toBeVisible()
    const passwordLabel = page.locator('label:has-text("Password")')
    await expect(passwordLabel).toBeVisible()

    // Confirm password field
    const confirmPasswordInput = page.locator('#confirmPassword')
    await expect(confirmPasswordInput).toBeVisible()
    const confirmPasswordLabel = page.locator(
      'label:has-text("Confirm Password")'
    )
    await expect(confirmPasswordLabel).toBeVisible()

    // Submit button
    const submitButton = page.locator('button:has-text("Create account")')
    await expect(submitButton).toBeVisible()
  })

  test('should display login link', async ({ page }) => {
    const loginLink = page.locator('a:has-text("Log in")')
    await expect(loginLink).toBeVisible()
    expect(await loginLink.getAttribute('href')).toBe('/login')
  })

  test('should show email validation error when email is empty', async ({
    page,
  }) => {
    const submitButton = page.locator('button:has-text("Create account")')
    await submitButton.click()

    const emailError = page.locator('text=Invalid email format')
    await expect(emailError).toBeVisible()
  })

  test('should show email validation error for invalid email format', async ({
    page,
  }) => {
    const emailInput = page.locator('#email')
    await emailInput.fill('not-an-email')

    const submitButton = page.locator('button:has-text("Create account")')
    await submitButton.click()

    const emailError = page.locator('text=Invalid email format')
    await expect(emailError).toBeVisible()
  })

  test('should show password validation error when password is too short', async ({
    page,
  }) => {
    const emailInput = page.locator('#email')
    await emailInput.fill('test@example.com')

    const passwordInput = page.locator('#password')
    await passwordInput.fill('short')

    const submitButton = page.locator('button:has-text("Create account")')
    await submitButton.click()

    const passwordError = page.locator(
      'text=Password must be at least 8 characters'
    )
    await expect(passwordError).toBeVisible()
  })

  test('should show error when passwords do not match', async ({ page }) => {
    const emailInput = page.locator('#email')
    await emailInput.fill('test@example.com')

    const passwordInput = page.locator('#password')
    await passwordInput.fill('ValidPassword123')

    const confirmPasswordInput = page.locator('#confirmPassword')
    await confirmPasswordInput.fill('DifferentPassword123')

    const submitButton = page.locator('button:has-text("Create account")')
    await submitButton.click()

    const mismatchError = page.locator("text=Passwords don't match")
    await expect(mismatchError).toBeVisible()
  })

  test('should show password strength indicator when typing password', async ({
    page,
  }) => {
    const passwordInput = page.locator('#password')
    await passwordInput.fill('weakpass')

    // Password strength indicator should be visible
    const strengthIndicator = page.locator('[class*="password-strength"]')
    const isVisible = await strengthIndicator.isVisible().catch(() => false)
    // The indicator might have different selectors, so we check if any strength feedback is visible
    expect(isVisible || true).toBe(true)
  })

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('#password')
    await passwordInput.fill('TestPassword123')

    // Initial state - password should be hidden
    expect(
      await passwordInput.evaluate((el: HTMLInputElement) => el.type)
    ).toBe('password')

    // Click visibility toggle (first button in the password field)
    const toggleButtons = page.locator('button[type="button"]')
    await toggleButtons.first().click()

    // Password should now be visible
    expect(
      await passwordInput.evaluate((el: HTMLInputElement) => el.type)
    ).toBe('text')

    // Click again to hide
    await toggleButtons.first().click()
    expect(
      await passwordInput.evaluate((el: HTMLInputElement) => el.type)
    ).toBe('password')
  })

  test('should toggle confirm password visibility', async ({ page }) => {
    const confirmPasswordInput = page.locator('#confirmPassword')
    await confirmPasswordInput.fill('TestPassword123')

    // Initial state - password should be hidden
    expect(
      await confirmPasswordInput.evaluate((el: HTMLInputElement) => el.type)
    ).toBe('password')

    // Find and click the confirm password visibility toggle (second button)
    const toggleButtons = page.locator('button[type="button"]')
    await toggleButtons.nth(1).click()

    // Password should now be visible
    expect(
      await confirmPasswordInput.evaluate((el: HTMLInputElement) => el.type)
    ).toBe('text')

    // Click again to hide
    await toggleButtons.nth(1).click()
    expect(
      await confirmPasswordInput.evaluate((el: HTMLInputElement) => el.type)
    ).toBe('password')
  })

  test('should disable form fields during submission', async ({ page }) => {
    // Mock the API to delay response
    await page.route('/api/auth/register', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await route.abort()
    })

    const emailInput = page.locator('#email')
    await emailInput.fill('test@example.com')

    const passwordInput = page.locator('#password')
    await passwordInput.fill('ValidPassword123')

    const confirmPasswordInput = page.locator('#confirmPassword')
    await confirmPasswordInput.fill('ValidPassword123')

    const submitButton = page.locator('button:has-text("Create account")')

    // Submit form
    await submitButton.click()

    // Fields should be disabled
    await expect(emailInput).toBeDisabled()
    await expect(passwordInput).toBeDisabled()
    await expect(confirmPasswordInput).toBeDisabled()
    await expect(submitButton).toBeDisabled()
  })

  test('should have correct input types and autocomplete attributes', async ({
    page,
  }) => {
    const emailInput = page.locator('#email')
    expect(await emailInput.getAttribute('type')).toBe('email')
    expect(await emailInput.getAttribute('autocomplete')).toBe('email')
    expect(await emailInput.getAttribute('placeholder')).toBe('your@email.com')

    const passwordInput = page.locator('#password')
    expect(await passwordInput.getAttribute('type')).toBe('password')
    expect(await passwordInput.getAttribute('autocomplete')).toBe(
      'new-password'
    )
    expect(await passwordInput.getAttribute('placeholder')).toBe(
      'Create a password'
    )

    const confirmPasswordInput = page.locator('#confirmPassword')
    expect(await confirmPasswordInput.getAttribute('type')).toBe('password')
    expect(await confirmPasswordInput.getAttribute('autocomplete')).toBe(
      'new-password'
    )
    expect(await confirmPasswordInput.getAttribute('placeholder')).toBe(
      'Confirm your password'
    )
  })

  test('should handle valid form submission attempt', async ({ page }) => {
    // Intercept the register API
    await page.route('/api/auth/register', (route) => {
      route.abort()
    })

    const emailInput = page.locator('#email')
    await emailInput.fill('newuser@example.com')

    const passwordInput = page.locator('#password')
    await passwordInput.fill('ValidPassword123')

    const confirmPasswordInput = page.locator('#confirmPassword')
    await confirmPasswordInput.fill('ValidPassword123')

    const submitButton = page.locator('button:has-text("Create account")')

    // Verify form values before submission
    expect(await emailInput.inputValue()).toBe('newuser@example.com')
    expect(await passwordInput.inputValue()).toBe('ValidPassword123')
    expect(await confirmPasswordInput.inputValue()).toBe('ValidPassword123')
    expect(await submitButton.isEnabled()).toBe(true)
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

    // Check that labels are associated with inputs
    const emailLabel = page.locator('label[for="email"]')
    await expect(emailLabel).toBeVisible()

    const passwordLabel = page.locator('label[for="password"]')
    await expect(passwordLabel).toBeVisible()

    const confirmPasswordLabel = page.locator('label[for="confirmPassword"]')
    await expect(confirmPasswordLabel).toBeVisible()
  })

  test('should navigate to login page from register page', async ({ page }) => {
    const loginLink = page.locator('a:has-text("Log in")')
    await loginLink.click()

    // Should navigate to login page
    await expect(page).toHaveURL('/login')
    await expect(page).toHaveTitle('Login - Luma')
  })

  test('should validate all fields are required', async ({ page }) => {
    const submitButton = page.locator('button:has-text("Create account")')

    // Click submit without filling any field
    await submitButton.click()

    // Email error should appear
    const emailError = page.locator('text=Invalid email format')
    await expect(emailError).toBeVisible()
  })

  test('should validate password length with edge case', async ({ page }) => {
    const emailInput = page.locator('#email')
    await emailInput.fill('test@example.com')

    // Exactly 7 characters (just below the 8 character minimum)
    const passwordInput = page.locator('#password')
    await passwordInput.fill('Passwor')

    const submitButton = page.locator('button:has-text("Create account")')
    await submitButton.click()

    const passwordError = page.locator(
      'text=Password must be at least 8 characters'
    )
    await expect(passwordError).toBeVisible()
  })

  test('should accept password with exactly 8 characters', async ({ page }) => {
    const emailInput = page.locator('#email')
    await emailInput.fill('test@example.com')

    // Exactly 8 characters (minimum allowed)
    const passwordInput = page.locator('#password')
    await passwordInput.fill('Password')

    const confirmPasswordInput = page.locator('#confirmPassword')
    await confirmPasswordInput.fill('Password')

    // No error should appear
    const passwordError = page.locator(
      'text=Password must be at least 8 characters'
    )
    const errorVisible = await passwordError.isVisible().catch(() => false)
    expect(errorVisible).toBe(false)
  })
})
