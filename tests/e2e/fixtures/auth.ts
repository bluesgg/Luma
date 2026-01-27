/**
 * E2E Test Fixtures - Authentication Helpers
 *
 * Provides reusable authentication helpers for E2E tests
 */

import { Page, expect } from '@playwright/test'

export interface TestUser {
  email: string
  password: string
  name?: string
}

/**
 * Register a new user
 */
export async function registerUser(
  page: Page,
  user: TestUser
): Promise<void> {
  await page.goto('/register')

  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', user.password)
  if (user.name) {
    await page.fill('input[name="name"]', user.name)
  }

  await page.click('button[type="submit"]')

  // Wait for success message or redirect
  await page.waitForURL(/\/(login|verify)/, { timeout: 5000 })
}

/**
 * Login as a user
 */
export async function loginUser(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login')

  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', user.password)

  await page.click('button[type="submit"]')

  // Wait for successful login
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 5000,
  })
}

/**
 * Logout current user
 */
export async function logoutUser(page: Page): Promise<void> {
  // Click user menu
  await page.click('[data-testid="user-menu"]')

  // Click logout button
  await page.click('button:has-text("Logout")')

  // Wait for redirect to login
  await page.waitForURL('/login', { timeout: 5000 })
}

/**
 * Verify email for a user
 */
export async function verifyEmail(page: Page, token: string): Promise<void> {
  await page.goto(`/auth/verify?token=${token}`)

  // Wait for verification success
  await expect(page.locator('text=verified')).toBeVisible({ timeout: 5000 })
}

/**
 * Login as admin user
 */
export async function loginAsAdmin(
  page: Page,
  credentials: { username: string; password: string }
): Promise<void> {
  await page.goto('/admin/login')

  await page.fill('input[name="username"]', credentials.username)
  await page.fill('input[name="password"]', credentials.password)

  await page.click('button[type="submit"]')

  // Wait for admin dashboard
  await page.waitForURL('/admin', { timeout: 5000 })
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Check for user menu or auth indicator
    const userMenu = page.locator('[data-testid="user-menu"]')
    return await userMenu.isVisible({ timeout: 1000 })
  } catch {
    return false
  }
}

/**
 * Get authentication cookies
 */
export async function getAuthCookies(page: Page): Promise<any[]> {
  const cookies = await page.context().cookies()
  return cookies.filter((c) => c.name.includes('auth') || c.name.includes('session'))
}

/**
 * Clear authentication
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.goto('/')
}

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `test-${timestamp}-${random}@example.com`
}

/**
 * Generate test user credentials
 */
export function generateTestUser(): TestUser {
  return {
    email: generateTestEmail(),
    password: 'Test123!@#',
    name: 'Test User',
  }
}

/**
 * Wait for authentication state
 */
export async function waitForAuth(page: Page, authenticated: boolean): Promise<void> {
  if (authenticated) {
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({
      timeout: 5000,
    })
  } else {
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible({
      timeout: 5000,
    })
  }
}

/**
 * Reset password flow
 */
export async function resetPassword(
  page: Page,
  email: string,
  newPassword: string,
  resetToken: string
): Promise<void> {
  // Request reset
  await page.goto('/forgot-password')
  await page.fill('input[name="email"]', email)
  await page.click('button[type="submit"]')

  // Use reset token
  await page.goto(`/reset-password?token=${resetToken}`)
  await page.fill('input[name="password"]', newPassword)
  await page.fill('input[name="confirmPassword"]', newPassword)
  await page.click('button[type="submit"]')

  // Wait for success
  await page.waitForURL('/login', { timeout: 5000 })
}

/**
 * Setup authenticated session for tests
 */
export async function setupAuthenticatedSession(page: Page): Promise<TestUser> {
  const user = generateTestUser()
  await registerUser(page, user)
  await loginUser(page, user)
  return user
}
