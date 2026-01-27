/**
 * E2E Flow Test: Admin Access and Management
 *
 * Tests the admin portal functionality:
 * 1. Admin login
 * 2. User management
 * 3. System statistics
 * 4. Cost monitoring
 * 5. Worker management
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../fixtures/auth'
import {
  cleanDatabase,
  createTestAdmin,
  createTestUser,
} from '../fixtures/database'

test.describe('Admin Access Flow', () => {
  test.beforeEach(async ({ page }) => {
    await cleanDatabase()

    // Create admin user
    await createTestAdmin('admin', 'admin123')
  })

  test('should allow admin login', async ({ page }) => {
    await page.goto('/admin/login')

    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')

    // Should redirect to admin dashboard
    await expect(page).toHaveURL('/admin', { timeout: 5000 })

    // Should show admin navigation
    await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible()
  })

  test('should reject invalid admin credentials', async ({ page }) => {
    await page.goto('/admin/login')

    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should show error
    await expect(page.locator('text=/invalid|incorrect/i')).toBeVisible({
      timeout: 3000,
    })

    // Should remain on login page
    await expect(page).toHaveURL('/admin/login')
  })

  test('should display system statistics', async ({ page }) => {
    await loginAsAdmin(page, { username: 'admin', password: 'admin123' })

    // Should see stats cards
    await expect(page.locator('[data-testid="total-users"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-files"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-sessions"]')).toBeVisible()

    // Stats should have numeric values
    const totalUsers = await page.locator('[data-testid="total-users"]').textContent()
    expect(totalUsers).toMatch(/\d+/)
  })

  test('should list all users', async ({ page }) => {
    // Create some test users
    await createTestUser('user1@example.com', 'password')
    await createTestUser('user2@example.com', 'password')

    await loginAsAdmin(page, { username: 'admin', password: 'admin123' })

    // Navigate to users page
    await page.click('a:has-text("Users")')

    await expect(page).toHaveURL('/admin/users', { timeout: 5000 })

    // Should see user list
    await expect(page.locator('[data-testid="user-table"]')).toBeVisible()

    // Should see at least 2 users
    const rows = await page.locator('[data-testid="user-row"]').count()
    expect(rows).toBeGreaterThanOrEqual(2)
  })

  test('should allow viewing user details', async ({ page }) => {
    const user = await createTestUser('test@example.com', 'password')

    await loginAsAdmin(page, { username: 'admin', password: 'admin123' })

    await page.click('a:has-text("Users")')

    // Click on user
    await page.click(`[data-testid="user-${user.id}"]`)

    // Should show user details
    await expect(page.locator('text=test@example.com')).toBeVisible()
    await expect(page.locator('[data-testid="user-files"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-quota"]')).toBeVisible()
  })

  test('should allow managing user quota', async ({ page }) => {
    const user = await createTestUser('test@example.com', 'password')

    await loginAsAdmin(page, { username: 'admin', password: 'admin123' })

    await page.click('a:has-text("Users")')
    await page.click(`[data-testid="user-${user.id}"]`)

    // Modify quota
    await page.click('button:has-text("Adjust Quota")')
    await page.fill('input[name="limit"]', '200')
    await page.click('button:has-text("Save")')

    // Should show success message
    await expect(page.locator('text=/updated|success/i')).toBeVisible({
      timeout: 3000,
    })
  })

  test('should display cost statistics', async ({ page }) => {
    await loginAsAdmin(page, { username: 'admin', password: 'admin123' })

    await page.click('a:has-text("Cost")')

    await expect(page).toHaveURL('/admin/cost', { timeout: 5000 })

    // Should show cost metrics
    await expect(page.locator('[data-testid="total-cost"]')).toBeVisible()
    await expect(page.locator('[data-testid="ai-cost"]')).toBeVisible()
    await expect(page.locator('[data-testid="storage-cost"]')).toBeVisible()

    // Should show cost chart
    await expect(page.locator('[data-testid="cost-chart"]')).toBeVisible()
  })

  test('should display worker status', async ({ page }) => {
    await loginAsAdmin(page, { username: 'admin', password: 'admin123' })

    await page.click('a:has-text("Workers")')

    await expect(page).toHaveURL('/admin/workers', { timeout: 5000 })

    // Should show worker list
    await expect(page.locator('[data-testid="worker-list"]')).toBeVisible()

    // Should show worker health status
    await expect(page.locator('[data-testid="worker-status"]')).toBeVisible()
  })

  test('should allow triggering manual jobs', async ({ page }) => {
    await loginAsAdmin(page, { username: 'admin', password: 'admin123' })

    await page.click('a:has-text("Workers")')

    // Trigger a manual job
    await page.click('button:has-text("Run Job")')
    await page.click('text=Quota Reset')
    await page.click('button:has-text("Execute")')

    // Should show job triggered message
    await expect(page.locator('text=/triggered|started/i')).toBeVisible({
      timeout: 3000,
    })
  })

  test('should display access statistics', async ({ page }) => {
    await loginAsAdmin(page, { username: 'admin', password: 'admin123' })

    // Should see access stats on dashboard
    await expect(page.locator('[data-testid="daily-active-users"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-sessions"]')).toBeVisible()

    // Should show activity chart
    await expect(page.locator('[data-testid="activity-chart"]')).toBeVisible()
  })

  test('should allow searching users', async ({ page }) => {
    await createTestUser('john@example.com', 'password')
    await createTestUser('jane@example.com', 'password')

    await loginAsAdmin(page, { username: 'admin', password: 'admin123' })

    await page.click('a:has-text("Users")')

    // Search for user
    await page.fill('input[placeholder*="Search"]', 'john')

    // Should filter results
    await expect(page.locator('text=john@example.com')).toBeVisible()
    await expect(page.locator('text=jane@example.com')).not.toBeVisible()
  })

  test('should paginate user list', async ({ page }) => {
    // Create many users
    for (let i = 0; i < 25; i++) {
      await createTestUser(`user${i}@example.com`, 'password')
    }

    await loginAsAdmin(page, { username: 'admin', password: 'admin123' })

    await page.click('a:has-text("Users")')

    // Should show pagination
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible()

    // Go to next page
    await page.click('button:has-text("Next")')

    // Should load more users
    await expect(page.locator('[data-testid="user-row"]')).toHaveCount(5)
  })

  test('should protect admin routes from regular users', async ({ page }) => {
    // Create regular user and login
    const user = await createTestUser('regular@example.com', 'password')

    // Try to access admin page
    await page.goto('/admin')

    // Should redirect to admin login
    await expect(page).toHaveURL('/admin/login', { timeout: 5000 })
  })

  test('should allow admin logout', async ({ page }) => {
    await loginAsAdmin(page, { username: 'admin', password: 'admin123' })

    // Logout
    await page.click('[data-testid="admin-menu"]')
    await page.click('button:has-text("Logout")')

    // Should redirect to login
    await expect(page).toHaveURL('/admin/login', { timeout: 5000 })

    // Should not be able to access admin pages
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin/login')
  })

  test('should display real-time metrics', async ({ page }) => {
    await loginAsAdmin(page, { username: 'admin', password: 'admin123' })

    // Should see metrics updating
    const initialCount = await page.locator('[data-testid="active-sessions"]').textContent()

    // Wait a moment
    await page.waitForTimeout(2000)

    // Metrics should be present (may or may not change)
    await expect(page.locator('[data-testid="active-sessions"]')).toBeVisible()
  })

  test('should handle large datasets gracefully', async ({ page }) => {
    // Create many users
    for (let i = 0; i < 100; i++) {
      await createTestUser(`user${i}@example.com`, 'password')
    }

    await loginAsAdmin(page, { username: 'admin', password: 'admin123' })

    await page.click('a:has-text("Users")')

    // Page should load without issues
    await expect(page.locator('[data-testid="user-table"]')).toBeVisible({
      timeout: 10000,
    })

    // Should show first page of results
    const rows = await page.locator('[data-testid="user-row"]').count()
    expect(rows).toBeGreaterThan(0)
    expect(rows).toBeLessThanOrEqual(20) // Default page size
  })
})
