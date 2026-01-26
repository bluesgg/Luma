# E2E Testing Guide for FileUploader

Quick reference for running and maintaining FileUploader E2E tests.

## Quick Start

### First Time Setup

```bash
# Install Playwright browsers
npx playwright install

# Verify installation
npx playwright --version
```

### Running Tests Locally

```bash
# Terminal 1: Start the dev server
npm run dev

# Terminal 2: Run all E2E tests
npm run test:e2e

# Or run specific test file
npm run test:e2e tests/e2e/file-uploader-ui.spec.ts
```

## Test Commands

### Basic Execution

```bash
# Run all tests
npm run test:e2e

# Run specific test file
npm run test:e2e tests/e2e/file-uploader-ui.spec.ts

# Run specific test by name
npm run test:e2e -g "should accept PDF file selection"

# Run with retries
npm run test:e2e -- --retries=2
```

### Interactive Modes

```bash
# Headed mode (see browser window)
npm run test:e2e:headed

# UI mode (interactive dashboard)
npm run test:e2e:ui

# Debug mode (with inspector)
npm run test:e2e:debug

# View last test report
npm run test:e2e:report
```

### Advanced Options

```bash
# Run with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run single worker (no parallelization)
npx playwright test --workers=1

# Generate trace for debugging
npx playwright test --trace=on

# Update screenshots/snapshots
npx playwright test --update-snapshots
```

## Test Structure

### Test File Location

```
tests/e2e/
├── file-uploader-ui.spec.ts    # Main test suite
└── fixtures/                    # Test data
    ├── sample.pdf
    ├── document.txt
    └── ... (other test files)
```

### Test Page

The tests use a dedicated test page at `/test-file-uploader`:
- Located at: `src/app/test-file-uploader/page.tsx`
- Provides isolated environment for testing
- Shows test information and instructions

## Understanding Test Results

### Test Output Format

```
Running 15 tests using 8 workers

ok 1 [chromium] test name (5.2s)
ok 2 [chromium] another test (4.8s)
x  3 [chromium] failed test (error message)

15 passed (24.6s)
```

- `ok` = Test passed
- `x` = Test failed
- `~` = Test skipped
- Number in parentheses = Execution time

### Interpreting Results

**All Passed:** Component is stable and working correctly
```
15 passed (24.6s)
```

**Some Failed:** Check error messages and test output
```
2 failed (30.2s)
```

**Some Skipped:** Component not available on test page
```
13 skipped, 2 passed (15.3s)
```

## Troubleshooting

### Dev Server Not Starting

**Problem:** Tests fail with "Cannot connect to localhost:3002"

**Solution:**
```bash
# Make sure dev server is running
npm run dev

# Check if port is in use
netstat -ano | findstr :3002

# Kill process using port
taskkill /PID <process_id> /F

# Or use different port
PORT=3005 npm run dev
# Then run tests with:
PLAYWRIGHT_BASE_URL=http://localhost:3005 npm run test:e2e
```

### Playwright Browsers Not Installed

**Problem:** "Failed to launch browser"

**Solution:**
```bash
# Install all browsers
npx playwright install

# Install specific browser
npx playwright install chromium

# Update browsers
npx playwright install --with-deps
```

### Tests Timing Out

**Problem:** "Test timeout 30000ms exceeded"

**Solution:**
```bash
# Increase timeout for slow network
npx playwright test --timeout=60000

# Check test page loads
curl http://localhost:3002/test-file-uploader

# Run single worker for debugging
npm run test:e2e -- --workers=1
```

### Flaky Tests

**Problem:** Tests pass sometimes but fail other times

**Solutions:**
1. Increase wait times in test: `{ timeout: 10000 }`
2. Use proper Playwright waits instead of `waitForTimeout`
3. Run tests multiple times to identify pattern
4. Check for race conditions in component code

## Adding New Tests

### Test Template

```typescript
test('should do something specific', async ({ page }) => {
  // Navigate to test page
  await page.goto('/test-file-uploader', { waitUntil: 'networkidle' })

  // Get component elements
  const uploadZone = page.getByTestId('file-upload-zone')

  // Verify initial state
  await expect(uploadZone).toBeVisible()

  // Perform action
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('./tests/fixtures/sample.pdf')

  // Verify result
  await expect(page.getByText('sample.pdf')).toBeVisible()
})
```

### Best Practices

1. **Use data-testid:** Prefer `getByTestId()` over other selectors
2. **Avoid hard waits:** Don't use `waitForTimeout()`, use proper expects
3. **Clear naming:** Test names should describe what they verify
4. **Single concern:** Each test should verify one specific behavior
5. **Proper cleanup:** Use beforeEach/afterEach for setup/teardown
6. **Accessibility:** Verify interactive elements have labels

### Common Selectors

```typescript
// By test ID (preferred)
page.getByTestId('file-upload-zone')

// By role (accessible)
page.getByRole('button', { name: /browse files/i })
page.getByRole('progressbar')
page.getByRole('status')

// By text
page.getByText('Upload complete')
page.getByText(/exact match/i)  // case insensitive

// Within component
const zone = page.getByTestId('file-upload-zone')
zone.getByRole('button')  // Button within zone only
```

## Test Fixtures

### Creating Test Files

```bash
# Generate all fixtures
node tests/fixtures/create-fixtures.js

# Files created:
# - sample.pdf (small, valid)
# - file1.pdf - file10.pdf (multiple files)
# - document.txt (non-PDF, for validation)
# - medium-file.pdf (50MB)
# - large-sample.pdf (150MB)
# - large-file.pdf (250MB, exceeds limit)
```

### Using Fixtures in Tests

```typescript
// Upload single file
const fileInput = page.locator('input[type="file"]')
await fileInput.setInputFiles('./tests/fixtures/sample.pdf')

// Upload multiple files
await fileInput.setInputFiles([
  './tests/fixtures/file1.pdf',
  './tests/fixtures/file2.pdf',
])

// Upload non-PDF (for validation testing)
await fileInput.setInputFiles('./tests/fixtures/document.txt')
```

## Debugging Tests

### Using Debug Mode

```bash
# Launch tests with inspector
npm run test:e2e:debug

# In inspector console:
page.url()                    # See current URL
await page.screenshot()       # Take screenshot
await page.pause()            # Pause execution
```

### Examining Failures

1. Check screenshot: `test-results/...chromium/test-failed-N.png`
2. Watch video: `test-results/...chromium/video.webm`
3. Read error message: Shows exact assertion that failed
4. Check trace: `test-results/...chromium/trace.zip`

### Adding Debug Output

```typescript
test('debug example', async ({ page }) => {
  console.log('Current URL:', page.url())

  const element = page.getByTestId('upload-zone')
  console.log('Element visible:', await element.isVisible())

  // Pause execution for inspection
  await page.pause()

  // Take screenshot
  await page.screenshot({ path: 'debug-screenshot.png' })
})
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Environment Variables

```bash
# Override base URL
PLAYWRIGHT_BASE_URL=https://staging.example.com npm run test:e2e

# Enable CI mode
CI=true npm run test:e2e

# Increase retries in CI
npm run test:e2e -- --retries=2
```

## Performance Tips

### Speeding Up Tests

1. **Use single worker locally for debugging:**
   ```bash
   npm run test:e2e -- --workers=1
   ```

2. **Parallel execution (default):**
   - 8 workers run 15 tests in ~25 seconds
   - Good for CI/CD pipelines

3. **Skip slow operations:**
   ```typescript
   // Don't wait for all network requests
   await page.goto(url, { waitUntil: 'domcontentloaded' })

   // Instead of
   await page.goto(url, { waitUntil: 'networkidle' })
   ```

## Maintenance Checklist

### Regular Tasks

- **Weekly:** Run test suite and review results
- **Monthly:** Update Playwright and browsers
- **Per Release:** Review and update test selectors if UI changes
- **When Flaky:** Debug and fix race conditions

### Before Deploying

1. Run all tests locally
2. Check test results don't have skipped tests
3. Verify no new flaky tests
4. Update test docs if features changed
5. Add tests for new features

## Resources

### Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Locator Guide](https://playwright.dev/docs/locators)
- [Best Practices](https://playwright.dev/docs/best-practices)

### Useful Commands

```bash
# Show all available test commands
npm run | grep test

# List all test files
find tests/e2e -name "*.spec.ts"

# Count tests
grep -r "test(" tests/e2e | wc -l

# Find flaky tests (run multiple times)
for i in {1..5}; do npm run test:e2e; done
```

## Getting Help

1. **Check test output:** Error message usually indicates problem
2. **Review screenshots:** Visual feedback helps debug
3. **Watch video:** Recorded browser actions help understand issue
4. **Run in debug mode:** Inspect elements and state
5. **Check Playwright docs:** Most issues have known solutions

---

**Last Updated:** January 25, 2026
**Playwright Version:** 1.58.0
**Status:** All Tests Passing
