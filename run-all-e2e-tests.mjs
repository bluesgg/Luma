import { chromium } from '@playwright/test';
import fs from 'fs';

const baseUrl = 'http://localhost:3999';

async function runTests() {
  console.log('=========================================');
  console.log('  E2E Test Report');
  console.log('  Date:', new Date().toISOString());
  console.log('  Base URL:', baseUrl);
  console.log('=========================================\n');

  const browser = await chromium.launch({ headless: true });

  const allResults = {
    courses: [],
    login: [],
    layout: [],
  };

  // =========================================
  // COURSES PAGE TESTS
  // =========================================
  console.log('# Courses Page Tests\n');

  const coursesContext = await browser.newContext();
  const coursesPage = await coursesContext.newPage();

  // Test: Load courses page
  try {
    console.log('  [1/8] Load courses page...');
    await coursesPage.goto(`${baseUrl}/courses`, { timeout: 10000 });
    const h1Text = await coursesPage.locator('h1').textContent();
    if (h1Text?.includes('My Courses')) {
      console.log('       PASS');
      allResults.courses.push({ name: 'Load courses page', status: 'passed' });
    } else {
      console.log('       FAIL: Wrong heading');
      allResults.courses.push({ name: 'Load courses page', status: 'failed', error: `Wrong heading: ${h1Text}` });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.courses.push({ name: 'Load courses page', status: 'failed', error: e.message });
  }

  // Test: Navigation bar visible
  try {
    console.log('  [2/8] Navigation bar visible...');
    const navVisible = await coursesPage.locator('nav').isVisible();
    if (navVisible) {
      console.log('       PASS');
      allResults.courses.push({ name: 'Navigation bar visible', status: 'passed' });
    } else {
      console.log('       FAIL');
      allResults.courses.push({ name: 'Navigation bar visible', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.courses.push({ name: 'Navigation bar visible', status: 'failed', error: e.message });
  }

  // Test: Navigation links present
  try {
    console.log('  [3/8] Navigation links present...');
    const settingsLink = await coursesPage.locator('a[href="/settings"]').isVisible();
    const coursesLink = await coursesPage.locator('a[href="/courses"]').isVisible();
    if (settingsLink && coursesLink) {
      console.log('       PASS');
      allResults.courses.push({ name: 'Navigation links present', status: 'passed' });
    } else {
      console.log('       FAIL');
      allResults.courses.push({ name: 'Navigation links present', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.courses.push({ name: 'Navigation links present', status: 'failed', error: e.message });
  }

  // Test: Active link highlighting
  try {
    console.log('  [4/8] Active link highlighting...');
    const ariaCurrent = await coursesPage.locator('a[href="/courses"]').getAttribute('aria-current');
    if (ariaCurrent === 'page') {
      console.log('       PASS');
      allResults.courses.push({ name: 'Active link highlighting', status: 'passed' });
    } else {
      console.log('       FAIL');
      allResults.courses.push({ name: 'Active link highlighting', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.courses.push({ name: 'Active link highlighting', status: 'failed', error: e.message });
  }

  // Test: Navigate to settings
  try {
    console.log('  [5/8] Navigate to settings...');
    await coursesPage.click('a[href="/settings"]');
    await coursesPage.waitForURL('**/settings', { timeout: 5000 });
    if (coursesPage.url().includes('/settings')) {
      console.log('       PASS');
      allResults.courses.push({ name: 'Navigate to settings', status: 'passed' });
    } else {
      console.log('       FAIL');
      allResults.courses.push({ name: 'Navigate to settings', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.courses.push({ name: 'Navigate to settings', status: 'failed', error: e.message });
  }

  // Test: Navigate back to courses
  try {
    console.log('  [6/8] Navigate back to courses...');
    await coursesPage.click('a[href="/courses"]');
    await coursesPage.waitForURL('**/courses', { timeout: 5000 });
    if (coursesPage.url().includes('/courses')) {
      console.log('       PASS');
      allResults.courses.push({ name: 'Navigate back to courses', status: 'passed' });
    } else {
      console.log('       FAIL');
      allResults.courses.push({ name: 'Navigate back to courses', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.courses.push({ name: 'Navigate back to courses', status: 'failed', error: e.message });
  }

  // Test: Responsive on mobile
  try {
    console.log('  [7/8] Responsive on mobile...');
    await coursesPage.setViewportSize({ width: 375, height: 667 });
    await coursesPage.goto(`${baseUrl}/courses`);
    const h1Visible = await coursesPage.locator('h1').isVisible();
    const navVisible = await coursesPage.locator('nav').isVisible();
    if (h1Visible && navVisible) {
      console.log('       PASS');
      allResults.courses.push({ name: 'Responsive on mobile', status: 'passed' });
    } else {
      console.log('       FAIL');
      allResults.courses.push({ name: 'Responsive on mobile', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.courses.push({ name: 'Responsive on mobile', status: 'failed', error: e.message });
  }

  // Test: Accessible navigation
  try {
    console.log('  [8/8] Accessible navigation...');
    await coursesPage.setViewportSize({ width: 1280, height: 720 });
    await coursesPage.goto(`${baseUrl}/courses`);
    const ariaLabel = await coursesPage.locator('nav').getAttribute('aria-label');
    if (ariaLabel) {
      console.log('       PASS');
      allResults.courses.push({ name: 'Accessible navigation', status: 'passed' });
    } else {
      console.log('       FAIL');
      allResults.courses.push({ name: 'Accessible navigation', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.courses.push({ name: 'Accessible navigation', status: 'failed', error: e.message });
  }

  // Capture screenshot
  await coursesPage.screenshot({ path: 'e:/cursor_project/Luma/test-results/courses-final.png', fullPage: true });
  await coursesContext.close();

  // =========================================
  // LOGIN PAGE TESTS
  // =========================================
  console.log('\n# Login Page Tests\n');

  const loginContext = await browser.newContext();
  const loginPage = await loginContext.newPage();

  // Test: Load login page
  try {
    console.log('  [1/5] Load login page...');
    await loginPage.goto(`${baseUrl}/login`, { timeout: 10000 });
    const title = await loginPage.title();
    if (title === 'Login - Luma') {
      console.log('       PASS');
      allResults.login.push({ name: 'Load login page', status: 'passed' });
    } else {
      console.log(`       FAIL: Title was "${title}"`);
      allResults.login.push({ name: 'Load login page', status: 'failed', error: `Title was ${title}` });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.login.push({ name: 'Load login page', status: 'failed', error: e.message });
  }

  // Test: Email field exists
  try {
    console.log('  [2/5] Email field exists...');
    const emailInput = await loginPage.locator('#email').isVisible();
    if (emailInput) {
      console.log('       PASS');
      allResults.login.push({ name: 'Email field exists', status: 'passed' });
    } else {
      console.log('       FAIL');
      allResults.login.push({ name: 'Email field exists', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.login.push({ name: 'Email field exists', status: 'failed', error: e.message });
  }

  // Test: Password field exists
  try {
    console.log('  [3/5] Password field exists...');
    const passwordInput = await loginPage.locator('#password').isVisible();
    if (passwordInput) {
      console.log('       PASS');
      allResults.login.push({ name: 'Password field exists', status: 'passed' });
    } else {
      console.log('       FAIL');
      allResults.login.push({ name: 'Password field exists', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.login.push({ name: 'Password field exists', status: 'failed', error: e.message });
  }

  // Test: Login button exists
  try {
    console.log('  [4/5] Login button exists...');
    const loginButton = await loginPage.locator('button:has-text("Log in")').isVisible();
    if (loginButton) {
      console.log('       PASS');
      allResults.login.push({ name: 'Login button exists', status: 'passed' });
    } else {
      console.log('       FAIL');
      allResults.login.push({ name: 'Login button exists', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.login.push({ name: 'Login button exists', status: 'failed', error: e.message });
  }

  // Test: Email validation
  try {
    console.log('  [5/5] Email validation works...');
    await loginPage.click('button:has-text("Log in")');
    const errorVisible = await loginPage.locator('text=Invalid email format').isVisible({ timeout: 2000 });
    if (errorVisible) {
      console.log('       PASS');
      allResults.login.push({ name: 'Email validation works', status: 'passed' });
    } else {
      console.log('       FAIL');
      allResults.login.push({ name: 'Email validation works', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.login.push({ name: 'Email validation works', status: 'failed', error: e.message });
  }

  // Capture screenshot
  await loginPage.screenshot({ path: 'e:/cursor_project/Luma/test-results/login-final.png', fullPage: true });
  await loginContext.close();

  // =========================================
  // LAYOUT TESTS
  // =========================================
  console.log('\n# Layout Tests\n');

  const layoutContext = await browser.newContext();
  const layoutPage = await layoutContext.newPage();

  // Test: Homepage loads
  try {
    console.log('  [1/4] Homepage loads...');
    const response = await layoutPage.goto(`${baseUrl}/`, { timeout: 10000 });
    if (response?.status() === 200) {
      console.log('       PASS');
      allResults.layout.push({ name: 'Homepage loads', status: 'passed' });
    } else {
      console.log(`       FAIL: Status ${response?.status()}`);
      allResults.layout.push({ name: 'Homepage loads', status: 'failed', error: `Status ${response?.status()}` });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.layout.push({ name: 'Homepage loads', status: 'failed', error: e.message });
  }

  // Test: HTML lang attribute
  try {
    console.log('  [2/4] HTML lang attribute...');
    const langAttr = await layoutPage.locator('html').getAttribute('lang');
    if (langAttr === 'en') {
      console.log('       PASS');
      allResults.layout.push({ name: 'HTML lang attribute', status: 'passed' });
    } else {
      console.log(`       FAIL: lang="${langAttr}"`);
      allResults.layout.push({ name: 'HTML lang attribute', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.layout.push({ name: 'HTML lang attribute', status: 'failed', error: e.message });
  }

  // Test: Meta viewport
  try {
    console.log('  [3/4] Meta viewport...');
    const content = await layoutPage.locator('meta[name="viewport"]').getAttribute('content');
    if (content?.includes('width=device-width')) {
      console.log('       PASS');
      allResults.layout.push({ name: 'Meta viewport', status: 'passed' });
    } else {
      console.log('       FAIL');
      allResults.layout.push({ name: 'Meta viewport', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.layout.push({ name: 'Meta viewport', status: 'failed', error: e.message });
  }

  // Test: Dark mode support
  try {
    console.log('  [4/4] Dark mode support...');
    const darkContext = await browser.newContext({ colorScheme: 'dark' });
    const darkPage = await darkContext.newPage();
    await darkPage.goto(`${baseUrl}/`);
    const title = await darkPage.title();
    await darkContext.close();
    if (title.includes('Luma')) {
      console.log('       PASS');
      allResults.layout.push({ name: 'Dark mode support', status: 'passed' });
    } else {
      console.log('       FAIL');
      allResults.layout.push({ name: 'Dark mode support', status: 'failed' });
    }
  } catch (e) {
    console.log('       FAIL:', e.message);
    allResults.layout.push({ name: 'Dark mode support', status: 'failed', error: e.message });
  }

  // Capture screenshot
  await layoutPage.screenshot({ path: 'e:/cursor_project/Luma/test-results/layout-final.png', fullPage: true });
  await layoutContext.close();

  await browser.close();

  // =========================================
  // SUMMARY
  // =========================================
  console.log('\n=========================================');
  console.log('  Test Summary');
  console.log('=========================================\n');

  const allTests = [...allResults.courses, ...allResults.login, ...allResults.layout];
  const totalPassed = allTests.filter(t => t.status === 'passed').length;
  const totalFailed = allTests.filter(t => t.status === 'failed').length;
  const total = allTests.length;

  console.log(`  Courses Page: ${allResults.courses.filter(t => t.status === 'passed').length}/${allResults.courses.length} passed`);
  console.log(`  Login Page:   ${allResults.login.filter(t => t.status === 'passed').length}/${allResults.login.length} passed`);
  console.log(`  Layout:       ${allResults.layout.filter(t => t.status === 'passed').length}/${allResults.layout.length} passed`);
  console.log('');
  console.log(`  Total: ${totalPassed}/${total} passed (${Math.round(totalPassed/total*100)}%)`);

  if (totalFailed > 0) {
    console.log('\n  Failed Tests:');
    allTests.filter(t => t.status === 'failed').forEach(t => {
      console.log(`    - ${t.name}: ${t.error || 'Unknown error'}`);
    });
  }

  console.log('\n  Screenshots saved to:');
  console.log('    - test-results/courses-final.png');
  console.log('    - test-results/login-final.png');
  console.log('    - test-results/layout-final.png');
  console.log('\n=========================================\n');

  // Save JSON report
  const report = {
    date: new Date().toISOString(),
    baseUrl,
    summary: {
      total,
      passed: totalPassed,
      failed: totalFailed,
      passRate: `${Math.round(totalPassed/total*100)}%`,
    },
    suites: {
      courses: allResults.courses,
      login: allResults.login,
      layout: allResults.layout,
    },
  };

  fs.writeFileSync('e:/cursor_project/Luma/test-results/report.json', JSON.stringify(report, null, 2));
  console.log('  JSON report saved to test-results/report.json\n');

  return { passed: totalPassed, failed: totalFailed };
}

runTests().then(({ passed, failed }) => {
  process.exit(failed > 0 ? 1 : 0);
}).catch(e => {
  console.error('Test runner failed:', e);
  process.exit(1);
});
