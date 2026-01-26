import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Luma Web E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Directory containing E2E test files
  testDir: './tests/e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if test.only is left in the code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigations
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server configuration - don't auto-start, use existing server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3002',
    reuseExistingServer: true,
    timeout: 30000,
  },

  // Output directory for test artifacts
  outputDir: 'test-results',

  // Global timeout for each test
  timeout: 30000,

  // Expect configuration
  expect: {
    timeout: 5000,
  },
})
