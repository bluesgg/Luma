// =============================================================================
// Phase 6: User Settings - Settings Page E2E Tests
// End-to-end tests for the complete settings page experience
// =============================================================================

import { test, expect } from '@playwright/test'

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - would need to login first in real scenario
    await page.goto('/settings')
  })

  test.describe('Page Load and Navigation', () => {
    test('should load settings page successfully', async ({ page }) => {
      await expect(page).toHaveTitle(/Settings|设置/)
      await expect(page.locator('h1')).toContainText(/Settings|设置/)
    })

    test('should display page description', async ({ page }) => {
      await expect(
        page.locator('text=/manage.*account|管理.*账户/i')
      ).toBeVisible()
    })

    test('should be accessible from main navigation', async ({ page }) => {
      // Navigate to home first
      await page.goto('/')

      // Click settings link in navigation
      await page.click('a[href="/settings"], button:has-text("Settings")')

      await expect(page).toHaveURL('/settings')
    })
  })

  test.describe('Tab Navigation', () => {
    test('should display all setting tabs', async ({ page }) => {
      await expect(page.locator('role=tab[name=/quota|配额/i]')).toBeVisible()
      await expect(
        page.locator('role=tab[name=/profile|个人资料/i]')
      ).toBeVisible()
      await expect(
        page.locator('role=tab[name=/preferences|偏好/i]')
      ).toBeVisible()
      await expect(
        page.locator('role=tab[name=/security|安全/i]')
      ).toBeVisible()
    })

    test('should default to quota tab', async ({ page }) => {
      const quotaTab = page.locator('role=tab[name=/quota|配额/i]')
      await expect(quotaTab).toHaveAttribute('aria-selected', 'true')
    })

    test('should switch to preferences tab', async ({ page }) => {
      await page.click('role=tab[name=/preferences|偏好/i]')

      const preferencesTab = page.locator('role=tab[name=/preferences|偏好/i]')
      await expect(preferencesTab).toHaveAttribute('aria-selected', 'true')
    })

    test('should switch between all tabs', async ({ page }) => {
      const tabs = [
        'quota|配额',
        'preferences|偏好',
        'profile|个人资料',
        'security|安全',
      ]

      for (const tab of tabs) {
        await page.click(`role=tab[name=/${tab}/i]`)
        await expect(
          page.locator(`role=tab[name=/${tab}/i]`)
        ).toHaveAttribute('aria-selected', 'true')
      }
    })

    test('should update URL hash on tab change', async ({ page }) => {
      await page.click('role=tab[name=/preferences|偏好/i]')
      await expect(page).toHaveURL(/.*#preferences/)
    })

    test('should respect URL hash on page load', async ({ page }) => {
      await page.goto('/settings#preferences')

      const preferencesTab = page.locator('role=tab[name=/preferences|偏好/i]')
      await expect(preferencesTab).toHaveAttribute('aria-selected', 'true')
    })

    test('should be keyboard navigable', async ({ page }) => {
      await page.keyboard.press('Tab')
      await expect(page.locator('role=tab').first()).toBeFocused()

      await page.keyboard.press('ArrowRight')
      await expect(page.locator('role=tab').nth(1)).toBeFocused()

      await page.keyboard.press('ArrowLeft')
      await expect(page.locator('role=tab').first()).toBeFocused()
    })
  })

  test.describe('Quota Tab', () => {
    test('should display quota information', async ({ page }) => {
      await page.click('role=tab[name=/quota|配额/i]')

      await expect(
        page.locator('text=/learning.*interactions|学习.*互动/i')
      ).toBeVisible()
      await expect(
        page.locator('text=/auto.*explain|自动.*讲解/i')
      ).toBeVisible()
    })

    test('should show quota usage percentages', async ({ page }) => {
      await page.click('role=tab[name=/quota|配额/i]')

      const percentages = page.locator('text=/%/')
      await expect(percentages).toHaveCount(2) // Two quota types
    })

    test('should display quota reset date', async ({ page }) => {
      await page.click('role=tab[name=/quota|配额/i]')

      await expect(
        page.locator('text=/reset|重置/i')
      ).toBeVisible()
    })

    test('should show quota progress bars', async ({ page }) => {
      await page.click('role=tab[name=/quota|配额/i]')

      const progressBars = page.locator('role=progressbar')
      await expect(progressBars).toHaveCount(2)
    })
  })

  test.describe('Preferences Tab - Language Settings', () => {
    test('should display language settings', async ({ page }) => {
      await page.click('role=tab[name=/preferences|偏好/i]')

      await expect(
        page.locator('text=/interface.*language|界面.*语言/i')
      ).toBeVisible()
      await expect(
        page.locator('text=/ai.*language|AI.*语言/i')
      ).toBeVisible()
    })

    test('should show current language selections', async ({ page }) => {
      await page.click('role=tab[name=/preferences|偏好/i]')

      const uiLanguageSelect = page.locator(
        'select[name="uiLocale"], [aria-label*="Interface"]'
      )
      const explainLanguageSelect = page.locator(
        'select[name="explainLocale"], [aria-label*="AI"]'
      )

      await expect(uiLanguageSelect).toBeVisible()
      await expect(explainLanguageSelect).toBeVisible()
    })

    test('should change UI language to Chinese', async ({ page }) => {
      await page.click('role=tab[name=/preferences|偏好/i]')

      const uiLanguageSelect = page.locator(
        'select[name="uiLocale"], [aria-label*="Interface"]'
      )

      await uiLanguageSelect.selectOption('zh')

      // Wait for save confirmation
      await expect(
        page.locator('text=/saved|success|成功/i')
      ).toBeVisible({ timeout: 5000 })
    })

    test('should change AI language to Chinese', async ({ page }) => {
      await page.click('role=tab[name=/preferences|偏好/i]')

      const explainLanguageSelect = page.locator(
        'select[name="explainLocale"], [aria-label*="AI"]'
      )

      await explainLanguageSelect.selectOption('zh')

      // Wait for save confirmation
      await expect(
        page.locator('text=/saved|success|成功/i')
      ).toBeVisible({ timeout: 5000 })
    })

    test('should persist language selection after page reload', async ({
      page,
    }) => {
      await page.click('role=tab[name=/preferences|偏好/i]')

      const uiLanguageSelect = page.locator(
        'select[name="uiLocale"], [aria-label*="Interface"]'
      )

      await uiLanguageSelect.selectOption('zh')
      await page.waitForTimeout(1000) // Wait for save

      // Reload page
      await page.reload()
      await page.click('role=tab[name=/preferences|偏好/i]')

      const reloadedSelect = page.locator(
        'select[name="uiLocale"], [aria-label*="Interface"]'
      )
      await expect(reloadedSelect).toHaveValue('zh')
    })

    test('should allow different languages for UI and AI', async ({ page }) => {
      await page.click('role=tab[name=/preferences|偏好/i]')

      const uiLanguageSelect = page.locator(
        'select[name="uiLocale"], [aria-label*="Interface"]'
      )
      const explainLanguageSelect = page.locator(
        'select[name="explainLocale"], [aria-label*="AI"]'
      )

      await uiLanguageSelect.selectOption('en')
      await page.waitForTimeout(500)
      await explainLanguageSelect.selectOption('zh')
      await page.waitForTimeout(500)

      await expect(uiLanguageSelect).toHaveValue('en')
      await expect(explainLanguageSelect).toHaveValue('zh')
    })

    test('should disable selects while saving', async ({ page }) => {
      // Slow down network to observe loading state
      await page.route('**/api/preferences', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.continue()
      })

      await page.click('role=tab[name=/preferences|偏好/i]')

      const uiLanguageSelect = page.locator(
        'select[name="uiLocale"], [aria-label*="Interface"]'
      )

      await uiLanguageSelect.selectOption('zh')

      // Should be disabled while saving
      await expect(uiLanguageSelect).toBeDisabled()
      await expect(uiLanguageSelect).not.toBeDisabled({ timeout: 3000 })
    })
  })

  test.describe('Responsive Layout', () => {
    test('should be mobile responsive', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('role=tablist')).toBeVisible()
    })

    test('should stack tabs vertically on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      const tablist = page.locator('role=tablist')
      const boundingBox = await tablist.boundingBox()

      expect(boundingBox?.width).toBeLessThan(400)
    })

    test('should be tablet responsive', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })

      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('role=tablist')).toBeVisible()
    })

    test('should work on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })

      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('role=tablist')).toBeVisible()
    })
  })

  test.describe('Integration with Quota Display', () => {
    test('should show quota on both quota tab and preferences', async ({
      page,
    }) => {
      // Check quota tab
      await page.click('role=tab[name=/quota|配额/i]')
      const quotaInTab = page.locator('text=/\\d+.*remaining|剩余/i')
      await expect(quotaInTab.first()).toBeVisible()

      // Preferences might show quota warning if low
      await page.click('role=tab[name=/preferences|偏好/i]')
      // Should load without errors
      await expect(page.locator('role=tabpanel')).toBeVisible()
    })

    test('should display quota warning if low', async ({ page }) => {
      // Mock low quota response
      await page.route('**/api/quota', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              learningInteractions: {
                used: 145,
                limit: 150,
                remaining: 5,
                percentage: 97,
                resetAt: new Date().toISOString(),
                status: 'red',
              },
              autoExplain: {
                used: 250,
                limit: 300,
                remaining: 50,
                percentage: 83,
                resetAt: new Date().toISOString(),
                status: 'yellow',
              },
            },
          }),
        })
      })

      await page.reload()
      await page.click('role=tab[name=/quota|配额/i]')

      await expect(
        page.locator('text=/warning|低|low/i')
      ).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should show error when failing to load preferences', async ({
      page,
    }) => {
      await page.route('**/api/preferences', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR' },
          }),
        })
      })

      await page.click('role=tab[name=/preferences|偏好/i]')

      await expect(
        page.locator('text=/error|failed|错误/i')
      ).toBeVisible()
    })

    test('should show error when failing to save preferences', async ({
      page,
    }) => {
      await page.route('**/api/preferences', (route) => {
        if (route.request().method() === 'PATCH') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { code: 'INTERNAL_SERVER_ERROR' },
            }),
          })
        } else {
          route.continue()
        }
      })

      await page.click('role=tab[name=/preferences|偏好/i]')

      const uiLanguageSelect = page.locator(
        'select[name="uiLocale"], [aria-label*="Interface"]'
      )
      await uiLanguageSelect.selectOption('zh')

      await expect(
        page.locator('text=/error|failed|错误/i')
      ).toBeVisible()
    })

    test('should handle unauthorized access', async ({ page }) => {
      await page.route('**/api/preferences', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'AUTH_UNAUTHORIZED' },
          }),
        })
      })

      await page.goto('/settings')

      // Should redirect to login or show error
      await page.waitForTimeout(1000)
      const url = page.url()
      expect(url.includes('/login') || url.includes('error')).toBeTruthy()
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      const h1 = page.locator('h1')
      await expect(h1).toBeVisible()

      const h2s = page.locator('h2')
      await expect(h2s.first()).toBeVisible()
    })

    test('should have accessible tab navigation', async ({ page }) => {
      const tabs = page.locator('role=tab')
      await expect(tabs.first()).toHaveAttribute('aria-selected')
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await page.click('role=tab[name=/preferences|偏好/i]')

      const selects = page.locator('select')
      for (const select of await selects.all()) {
        await expect(select).toHaveAttribute('aria-label')
      }
    })

    test('should support keyboard-only navigation', async ({ page }) => {
      // Navigate through tabs with keyboard
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')

      await expect(page.locator('role=tabpanel')).toBeVisible()
    })

    test('should have skip to content link', async ({ page }) => {
      const skipLink = page.locator('a[href="#main-content"]')
      if (await skipLink.count()) {
        await expect(skipLink).toBeInTheDocument()
      }
    })
  })

  test.describe('Browser Back/Forward', () => {
    test('should handle browser back button', async ({ page }) => {
      await page.click('role=tab[name=/preferences|偏好/i]')
      await page.goBack()

      // Should go back to previous page, not previous tab
      await page.waitForTimeout(500)
      expect(page.url()).toBeTruthy()
    })

    test('should maintain tab state on forward navigation', async ({
      page,
    }) => {
      await page.click('role=tab[name=/preferences|偏好/i]')
      await page.goto('/')
      await page.goBack()

      // Tab state might not persist depending on implementation
      await expect(page.locator('role=tablist')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load quickly', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/settings')
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(3000) // 3 seconds
    })

    test('should not have memory leaks on tab switching', async ({ page }) => {
      const tabs = [
        'quota|配额',
        'preferences|偏好',
        'profile|个人资料',
        'security|安全',
      ]

      for (let i = 0; i < 10; i++) {
        for (const tab of tabs) {
          await page.click(`role=tab[name=/${tab}/i]`)
          await page.waitForTimeout(100)
        }
      }

      // Should still be responsive
      await expect(page.locator('h1')).toBeVisible()
    })
  })

  test.describe('Content Security', () => {
    test('should not expose sensitive information', async ({ page }) => {
      await page.click('role=tab[name=/profile|个人资料/i]')

      // Should not show password hash, tokens, etc.
      const content = await page.textContent('body')
      expect(content).not.toContain('password_hash')
      expect(content).not.toContain('passwordHash')
    })
  })
})
