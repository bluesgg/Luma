# E2E Auth Tests - Quick Start Guide

## What's New

4 complete E2E test files have been created for Phase 1: User Authentication:

- `/tests/e2e/auth/login.spec.ts` (17 tests)
- `/tests/e2e/auth/register.spec.ts` (21 tests)
- `/tests/e2e/auth/forgot-password.spec.ts` (17 tests)
- `/tests/e2e/auth/reset-password.spec.ts` (16 tests)

**Total: 71 tests covering all authentication flows**

## Running Tests

### Quick Start (All Tests)

```bash
cd /Users/samguan/Desktop/project/Luma
npx playwright test tests/e2e/auth/ --project=chromium
```

### Individual Test Suites

```bash
# Login tests only
npx playwright test tests/e2e/auth/login.spec.ts --project=chromium

# Register tests only
npx playwright test tests/e2e/auth/register.spec.ts --project=chromium

# Forgot password tests only
npx playwright test tests/e2e/auth/forgot-password.spec.ts --project=chromium

# Reset password tests only
npx playwright test tests/e2e/auth/reset-password.spec.ts --project=chromium
```

### Debug Mode

```bash
npx playwright test tests/e2e/auth/ --debug
npx playwright test tests/e2e/auth/ --headed  # See browser
```

### View Reports

```bash
npx playwright show-report
```

## Test Coverage Summary

### Login Tests (17 tests)

✓ Page loads with correct title and heading
✓ All form fields displayed (email, password, remember me)
✓ Navigation links present and working
✓ Email validation (empty, invalid format)
✓ Password validation (empty)
✓ Password visibility toggle
✓ Remember me checkbox toggle
✓ Submit button disabled during loading
✓ Verified email alerts (success & error)
✓ Correct input types and autocomplete
✓ Navigation to register and forgot password
✓ Error message clearing

### Register Tests (21 tests)

✓ Page loads with correct title and heading
✓ All form fields displayed (email, password, confirm password)
✓ Email validation (empty, invalid format)
✓ Password validation (too short, minimum 8 chars)
✓ Password mismatch error
✓ Password strength indicator
✓ Password visibility toggle (both fields)
✓ Form fields disabled during submission
✓ Correct input types and autocomplete
✓ Button disabled during loading
✓ Navigation to login
✓ All fields required validation
✓ Edge case: 7 chars vs 8 chars password

### Forgot Password Tests (17 tests)

✓ Page loads with correct title and heading
✓ Email input field displayed
✓ Submit button and helper text present
✓ Back to login link
✓ Email validation (empty, invalid)
✓ Email validation for special characters
✓ Valid email acceptance
✓ Multiple TLD support (.com, .co.uk, .org, etc.)
✓ Button disabled during submission
✓ Correct input attributes
✓ API mocking
✓ Navigation to login
✓ Email addresses with special characters (+, ., -, etc.)

### Reset Password Tests (16 tests)

✓ Redirects to forgot-password when no token
✓ Page loads with valid token
✓ Token field (hidden) displays correctly
✓ Password validation (too short, minimum 8 chars)
✓ Password mismatch error
✓ Password strength indicator
✓ Password visibility toggle (both fields)
✓ Form fields disabled during submission
✓ Correct input types and autocomplete
✓ Button text changes during loading
✓ Special characters in password
✓ Token handling in URL
✓ Edge cases (7 vs 8 chars)

## What Each Test Covers

### Form Validation

- Empty field handling
- Email format validation
- Password length requirements (minimum 8 characters)
- Password confirmation matching
- Error message display and clearing

### User Interactions

- Password visibility toggles
- Checkbox interactions
- Button states (enabled/disabled)
- Loading states

### Navigation

- Links between auth pages
- URL redirects based on parameters
- Redirect logic (e.g., no token → forgot-password)

### Accessibility

- Form labels associated with inputs
- Semantic HTML structure
- Input types and autocomplete attributes

### Alerts & Notifications

- Email verification success alert
- Email verification failure alert
- Error messages in forms

## Test File Locations

```
/Users/samguan/Desktop/project/Luma/
├── tests/
│   └── e2e/
│       └── auth/
│           ├── login.spec.ts          (17 tests)
│           ├── register.spec.ts       (21 tests)
│           ├── forgot-password.spec.ts (17 tests)
│           └── reset-password.spec.ts (16 tests)
├── E2E_AUTH_QUICK_START.md           (this file)
└── docs/
    └── PHASE1_AUTH_E2E_TESTS.md      (detailed documentation)
```

## Prerequisites

- Node.js 18+
- Dependencies installed: `npm install` or `pnpm install`
- Playwright browsers installed: `npx playwright install`

## Environment Variables

Optional environment variable to override test URL:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/auth/
```

Default: `http://localhost:3000`

## Expected Results

When running tests:

1. **Development Server**: Playwright will start your dev server automatically (or use existing one)
2. **Browser**: Tests run in headless Chrome by default
3. **Report**: HTML report generated in `playwright-report/` directory
4. **Results**: All 71 tests should PASS if the application is working correctly

## What's Tested vs Not Tested

### ✓ Tested (UI/E2E)

- Form fields render correctly
- Validation messages display
- Form interactions (typing, clicking)
- Navigation between pages
- Button states and loading indicators
- Input field properties (type, autocomplete)
- Error alerts and notifications

### ✗ Not Tested (API/Backend)

- Actual user creation
- Actual login functionality
- Database operations
- Email sending
- JWT token generation
- Actual authentication state persistence

These are tested in integration/API tests.

## Troubleshooting

### Tests fail with "element not found"

- Check if selectors match your HTML
- Verify form field IDs are: #email, #password, #confirmPassword, #rememberMe
- Check if button text matches: "Log in", "Create account", etc.

### Tests hang/timeout

- Ensure dev server is running on http://localhost:3000
- Check for browser compatibility (Chrome/Chromium recommended)
- Increase timeout in playwright.config.ts if needed

### API route errors

- Tests mock API calls, so no actual API calls should be made
- If you see API errors, check that routes are mocked in tests

### Browser not found

```bash
npx playwright install chromium
```

## Next Steps

1. Run the tests to verify authentication UI is working
2. Fix any failing tests by adjusting selectors if UI changed
3. Keep tests updated as authentication features evolve
4. Add integration tests for actual authentication logic
5. Add visual regression tests for form styling

## Documentation

For detailed test documentation, see:

- `/Users/samguan/Desktop/project/Luma/docs/PHASE1_AUTH_E2E_TESTS.md`

This document includes:

- Complete list of all 71 tests
- Test structure and patterns
- Implementation details
- Future enhancements
- Maintenance guidelines
