import { chromium } from '@playwright/test';

const baseUrl = 'http://localhost:3999';

async function runTests() {
  console.log('Starting E2E tests for courses page...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];

  // Test 1: Load courses page successfully
  try {
    console.log('Test 1: should load courses page successfully');
    await page.goto(`${baseUrl}/courses`);
    const title = await page.title();
    const h1Text = await page.locator('h1').textContent();

    if (h1Text && h1Text.includes('My Courses')) {
      console.log('  PASSED: Page loaded with correct heading');
      results.push({ name: 'load courses page', status: 'passed' });
    } else {
      console.log(`  FAILED: Expected "My Courses" but got "${h1Text}"`);
      results.push({ name: 'load courses page', status: 'failed', error: `Wrong heading: ${h1Text}` });
    }
  } catch (e) {
    console.log('  FAILED:', e.message);
    results.push({ name: 'load courses page', status: 'failed', error: e.message });
  }

  // Test 2: Display navigation bar
  try {
    console.log('\nTest 2: should display navigation bar');
    await page.goto(`${baseUrl}/courses`);
    const nav = await page.locator('nav').isVisible();

    if (nav) {
      console.log('  PASSED: Navigation bar is visible');
      results.push({ name: 'display navigation bar', status: 'passed' });
    } else {
      console.log('  FAILED: Navigation bar not visible');
      results.push({ name: 'display navigation bar', status: 'failed' });
    }
  } catch (e) {
    console.log('  FAILED:', e.message);
    results.push({ name: 'display navigation bar', status: 'failed', error: e.message });
  }

  // Test 3: Navigation links
  try {
    console.log('\nTest 3: should have navigation links');
    await page.goto(`${baseUrl}/courses`);
    const settingsLink = await page.locator('a[href="/settings"]').isVisible();
    const coursesLink = await page.locator('a[href="/courses"]').isVisible();

    if (settingsLink && coursesLink) {
      console.log('  PASSED: Navigation links are visible');
      results.push({ name: 'navigation links', status: 'passed' });
    } else {
      console.log('  FAILED: Navigation links missing');
      results.push({ name: 'navigation links', status: 'failed' });
    }
  } catch (e) {
    console.log('  FAILED:', e.message);
    results.push({ name: 'navigation links', status: 'failed', error: e.message });
  }

  // Test 4: Active link highlighting
  try {
    console.log('\nTest 4: should highlight active courses link');
    await page.goto(`${baseUrl}/courses`);
    const coursesLink = page.locator('a[href="/courses"]');
    const ariaCurrent = await coursesLink.getAttribute('aria-current');

    if (ariaCurrent === 'page') {
      console.log('  PASSED: Active link has aria-current="page"');
      results.push({ name: 'active link highlighting', status: 'passed' });
    } else {
      console.log(`  FAILED: Expected aria-current="page" but got "${ariaCurrent}"`);
      results.push({ name: 'active link highlighting', status: 'failed' });
    }
  } catch (e) {
    console.log('  FAILED:', e.message);
    results.push({ name: 'active link highlighting', status: 'failed', error: e.message });
  }

  // Test 5: Navigate to settings
  try {
    console.log('\nTest 5: should navigate from courses to settings');
    await page.goto(`${baseUrl}/courses`);
    await page.click('a[href="/settings"]');
    await page.waitForURL('**/settings');

    const h1 = await page.locator('h1').textContent();
    if (page.url().includes('/settings')) {
      console.log('  PASSED: Navigated to settings page');
      results.push({ name: 'navigate to settings', status: 'passed' });
    } else {
      console.log('  FAILED: Not on settings page');
      results.push({ name: 'navigate to settings', status: 'failed' });
    }
  } catch (e) {
    console.log('  FAILED:', e.message);
    results.push({ name: 'navigate to settings', status: 'failed', error: e.message });
  }

  // Test 6: Responsive on mobile
  try {
    console.log('\nTest 6: should be responsive on mobile');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${baseUrl}/courses`);
    const h1Visible = await page.locator('h1').isVisible();
    const navVisible = await page.locator('nav').isVisible();

    if (h1Visible && navVisible) {
      console.log('  PASSED: Page renders correctly on mobile');
      results.push({ name: 'responsive on mobile', status: 'passed' });
    } else {
      console.log('  FAILED: Page not rendering correctly on mobile');
      results.push({ name: 'responsive on mobile', status: 'failed' });
    }
  } catch (e) {
    console.log('  FAILED:', e.message);
    results.push({ name: 'responsive on mobile', status: 'failed', error: e.message });
  }

  // Test 7: Accessible navigation
  try {
    console.log('\nTest 7: should have accessible navigation');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${baseUrl}/courses`);
    const ariaLabel = await page.locator('nav').getAttribute('aria-label');

    if (ariaLabel) {
      console.log(`  PASSED: Navigation has aria-label="${ariaLabel}"`);
      results.push({ name: 'accessible navigation', status: 'passed' });
    } else {
      console.log('  FAILED: Navigation missing aria-label');
      results.push({ name: 'accessible navigation', status: 'failed' });
    }
  } catch (e) {
    console.log('  FAILED:', e.message);
    results.push({ name: 'accessible navigation', status: 'failed', error: e.message });
  }

  // Test 8: No console errors
  try {
    console.log('\nTest 8: should not have console errors');
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`${baseUrl}/courses`);
    await page.waitForLoadState('networkidle');

    const reactErrors = errors.filter(err =>
      err.includes('Error') ||
      err.includes('Failed') ||
      err.includes('undefined')
    );

    if (reactErrors.length === 0) {
      console.log('  PASSED: No console errors');
      results.push({ name: 'no console errors', status: 'passed' });
    } else {
      console.log('  FAILED: Console errors found:', reactErrors);
      results.push({ name: 'no console errors', status: 'failed', error: reactErrors.join(', ') });
    }
  } catch (e) {
    console.log('  FAILED:', e.message);
    results.push({ name: 'no console errors', status: 'failed', error: e.message });
  }

  // Take screenshot
  try {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${baseUrl}/courses`);
    await page.screenshot({ path: 'e:/cursor_project/Luma/test-results/courses-page.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/courses-page.png');
  } catch (e) {
    console.log('Could not save screenshot:', e.message);
  }

  await browser.close();

  // Summary
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;

  console.log('\n========================================');
  console.log(`E2E Test Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  return { passed, failed, results };
}

runTests().then(({ passed, failed }) => {
  process.exit(failed > 0 ? 1 : 0);
}).catch(e => {
  console.error('Test runner failed:', e);
  process.exit(1);
});
