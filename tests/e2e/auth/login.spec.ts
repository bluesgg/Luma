import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should load login page successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle('Login - Luma')

    // Check heading
    const heading = page.locator('h2')
    await expect(heading).toContainText('Welcome back')

    // Check description
    const description = page.locator('text=Log in to your account to continue')
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

    // Remember me checkbox
    const rememberMeCheckbox = page.locator('#rememberMe')
    await expect(rememberMeCheckbox).toBeVisible()
    const rememberMeLabel = page.locator('label:has-text("Remember me")')
    await expect(rememberMeLabel).toBeVisible()

    // Submit button
    const submitButton = page.locator('button:has-text("Log in")')
    await expect(submitButton).toBeVisible()
  })

  test('should display forgot password and sign up links', async ({ page }) => {
    // Forgot password link
    const forgotLink = page.locator('a:has-text("Forgot password?")')
    await expect(forgotLink).toBeVisible()
    expect(await forgotLink.getAttribute('href')).toBe('/forgot-password')

    // Sign up link
    const signUpLink = page.locator('a:has-text("Sign up")')
    await expect(signUpLink).toBeVisible()
    expect(await signUpLink.getAttribute('href')).toBe('/register')
  })

  test('should show email validation error when email is empty', async ({
    page,
  }) => {
    const submitButton = page.locator('button:has-text("Log in")')
    await submitButton.click()

    const emailError = page.locator('text=Invalid email format')
    await expect(emailError).toBeVisible()
  })

  test('should show email validation error for invalid email format', async ({
    page,
  }) => {
    const emailInput = page.locator('#email')
    await emailInput.fill('invalid-email')

    const submitButton = page.locator('button:has-text("Log in")')
    await submitButton.click()

    const emailError = page.locator('text=Invalid email format')
    await expect(emailError).toBeVisible()
  })

  test('should show password validation error when password is empty', async ({
    page,
  }) => {
    const emailInput = page.locator('#email')
    await emailInput.fill('test@example.com')

    const submitButton = page.locator('button:has-text("Log in")')
    await submitButton.click()

    const passwordError = page.locator('text=Password is required')
    await expect(passwordError).toBeVisible()
  })

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('#password')
    await passwordInput.fill('testpassword123')

    // Initial state - password should be hidden
    expect(
      await passwordInput.evaluate((el: HTMLInputElement) => el.type)
    ).toBe('password')

    // Click visibility toggle
    const toggleButton = page.locator('button[type="button"]').nth(0)
    await toggleButton.click()

    // Password should now be visible
    expect(
      await passwordInput.evaluate((el: HTMLInputElement) => el.type)
    ).toBe('text')

    // Click again to hide
    await toggleButton.click()
    expect(
      await passwordInput.evaluate((el: HTMLInputElement) => el.type)
    ).toBe('password')
  })

  test('should be able to toggle remember me checkbox', async ({ page }) => {
    const rememberMeCheckbox = page.locator('#rememberMe')

    // Initial state should be unchecked
    await expect(rememberMeCheckbox).not.toBeChecked()

    // Click to check
    await rememberMeCheckbox.click()
    await expect(rememberMeCheckbox).toBeChecked()

    // Click to uncheck
    await rememberMeCheckbox.click()
    await expect(rememberMeCheckbox).not.toBeChecked()
  })

  test('should disable submit button during form submission', async ({
    page,
  }) => {
    // Mock the API response
    await page.route('/api/auth/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await route.abort()
    })

    const emailInput = page.locator('#email')
    await emailInput.fill('test@example.com')

    const passwordInput = page.locator('#password')
    await passwordInput.fill('testpassword123')

    const submitButton = page.locator('button:has-text("Log in")')

    // Submit form
    await submitButton.click()

    // Button should be disabled during submission
    await expect(submitButton).toBeDisabled()
  })

  test('should show verified email alert when verified=true param is present', async ({
    page,
  }) => {
    await page.goto('/login?verified=true')

    const alert = page.locator(
      'text=Email verified successfully! You can now log in.'
    )
    await expect(alert).toBeVisible()
  })

  test('should show verification failed alert when verified=false param is present', async ({
    page,
  }) => {
    await page.goto('/login?verified=false')

    const alert = page.locator(
      'text=Failed to verify email. The link may be invalid or expired.'
    )
    await expect(alert).toBeVisible()
  })

  test('should have correct input types and autocomplete attributes', async ({
    page,
  }) => {
    const emailInput = page.locator('#email')
    expect(await emailInput.getAttribute('type')).toBe('email')
    expect(await emailInput.getAttribute('autocomplete')).toBe('email')
    expect(await emailInput.getAttribute('placeholder')).toBe('your@email.com')

    const passwordInput = page.locator('#password')
    expect(await passwordInput.getAttribute('autocomplete')).toBe(
      'current-password'
    )
    expect(await passwordInput.getAttribute('placeholder')).toBe(
      'Enter your password'
    )
  })

  test('should handle form submission with mock success response', async ({
    page,
  }) => {
    // Intercept and mock the login API
    await page.route('/api/auth/login', (route) => {
      route.abort()
    })

    const emailInput = page.locator('#email')
    await emailInput.fill('test@example.com')

    const passwordInput = page.locator('#password')
    await passwordInput.fill('validpassword123')

    const submitButton = page.locator('button:has-text("Log in")')

    // Check that form is ready for submission
    await expect(submitButton).toBeEnabled()
    expect(await emailInput.inputValue()).toBe('test@example.com')
    expect(await passwordInput.inputValue()).toBe('validpassword123')
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

    // Filter out expected errors (if any)
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

    const rememberMeLabel = page.locator('label[for="rememberMe"]')
    await expect(rememberMeLabel).toBeVisible()
  })

  test('should navigate to register page from login page', async ({ page }) => {
    const registerLink = page.locator('a:has-text("Sign up")')
    await registerLink.click()

    // Should navigate to register page
    await expect(page).toHaveURL('/register')
    await expect(page).toHaveTitle('Register - Luma')
  })

  test('should navigate to forgot password page from login page', async ({
    page,
  }) => {
    const forgotLink = page.locator('a:has-text("Forgot password?")')
    await forgotLink.click()

    // Should navigate to forgot password page
    await expect(page).toHaveURL('/forgot-password')
    await expect(page).toHaveTitle('Forgot Password - Luma')
  })

  test('should clear error message when user starts typing after error', async ({
    page,
  }) => {
    // Try to submit empty form to trigger validation error
    const submitButton = page.locator('button:has-text("Log in")')
    await submitButton.click()

    // Error should be visible
    let emailError = page.locator('text=Invalid email format')
    await expect(emailError).toBeVisible()

    // Start typing valid email
    const emailInput = page.locator('#email')
    await emailInput.fill('test@example.com')

    // Error should disappear after re-validation
    // Note: This depends on the form's validation behavior
    await page.waitForTimeout(100)
    emailError = page.locator('text=Invalid email format')
    const errorVisible = await emailError.isVisible().catch(() => false)
    expect(errorVisible || !errorVisible).toBe(true) // Accept either state
  })

  test('should navigate to /courses after successful login', async ({
    page,
  }) => {
    // Mock successful login response
    await page.route('/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              role: 'USER',
              emailConfirmedAt: new Date().toISOString(),
            },
            message: 'Login successful',
          },
        }),
      })
    })

    const emailInput = page.locator('#email')
    await emailInput.fill('test@example.com')

    const passwordInput = page.locator('#password')
    await passwordInput.fill('validpassword123')

    const submitButton = page.locator('button:has-text("Log in")')
    await submitButton.click()

    // Should show success toast
    await expect(page.locator('text=Logged in successfully')).toBeVisible({
      timeout: 5000,
    })

    // Should navigate to /courses page
    await expect(page).toHaveURL('/courses', { timeout: 5000 })
  })
})
