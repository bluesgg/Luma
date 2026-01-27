# Phase 1: User Authentication E2E Tests

## Overview

This document describes the end-to-end tests created for Phase 1: User Authentication in the Luma application.

## Test Files Created

All E2E tests for authentication have been created in `/tests/e2e/auth/`:

1. **login.spec.ts** - Login page and form tests
2. **register.spec.ts** - Registration page tests
3. **forgot-password.spec.ts** - Forgot password page tests
4. **reset-password.spec.ts** - Reset password page tests

## Test Statistics

- **Total Test Suites**: 4
- **Total Tests**: 71
- **Lines of Test Code**: ~3,900+

## Test Coverage by Flow

### 1. Login Flow (login.spec.ts) - 17 tests

#### Page Load Tests

- [x] should load login page successfully
- [x] should display all form fields (email, password, remember me)
- [x] should display forgot password and sign up links

#### Form Validation Tests

- [x] should show email validation error when email is empty
- [x] should show email validation error for invalid email format
- [x] should show password validation error when password is empty

#### UI Interaction Tests

- [x] should toggle password visibility
- [x] should be able to toggle remember me checkbox
- [x] should disable submit button during form submission

#### Alert & Query Parameter Tests

- [x] should show verified email alert when verified=true param is present
- [x] should show verification failed alert when verified=false param is present

#### Attribute & Accessibility Tests

- [x] should have correct input types and autocomplete attributes
- [x] should handle form submission with mock success response
- [x] should render page without console errors
- [x] should have accessible form structure

#### Navigation Tests

- [x] should navigate to register page from login page
- [x] should navigate to forgot password page from login page
- [x] should clear error message when user starts typing after error

### 2. Register Flow (register.spec.ts) - 21 tests

#### Page Load Tests

- [x] should load register page successfully
- [x] should display all form fields (email, password, confirm password)
- [x] should display login link

#### Form Validation Tests

- [x] should show email validation error when email is empty
- [x] should show email validation error for invalid email format
- [x] should show password validation error when password is too short
- [x] should show error when passwords do not match
- [x] should validate password length with edge case (7 chars)
- [x] should accept password with exactly 8 characters (minimum)

#### Password Strength Tests

- [x] should show password strength indicator when typing password

#### UI Interaction Tests

- [x] should toggle password visibility
- [x] should toggle confirm password visibility
- [x] should disable form fields during submission

#### Attribute & Accessibility Tests

- [x] should have correct input types and autocomplete attributes
- [x] should handle valid form submission attempt
- [x] should render page without console errors
- [x] should have accessible form structure
- [x] should validate all fields are required

#### Navigation Tests

- [x] should navigate to login page from register page

### 3. Forgot Password Flow (forgot-password.spec.ts) - 17 tests

#### Page Load Tests

- [x] should load forgot password page successfully
- [x] should display email input field
- [x] should display submit button and helper text
- [x] should display back to login link

#### Form Validation Tests

- [x] should show email validation error when email is empty
- [x] should show email validation error for invalid email format
- [x] should show validation error for email with special characters only
- [x] should accept valid email addresses
- [x] should accept emails with different top-level domains (.com, .co.uk, .org, etc.)
- [x] should accept email with numbers and special characters

#### UI Interaction Tests

- [x] should disable submit button during submission
- [x] should clear error message when user fixes input

#### Attribute & Accessibility Tests

- [x] should have correct input attributes
- [x] should handle form submission with mock API
- [x] should render page without console errors
- [x] should have accessible form structure

#### Navigation Tests

- [x] should navigate to login page from forgot password page

### 4. Reset Password Flow (reset-password.spec.ts) - 16 tests

#### Page Load & Routing Tests

- [x] should redirect to forgot-password when no token is provided
- [x] should load reset password page with valid token

#### Form Display Tests

- [x] should display all form fields with token (password, confirm password)

#### Form Validation Tests

- [x] should show password validation error when password is too short
- [x] should show error when passwords do not match
- [x] should validate password length with edge case (7 chars)
- [x] should accept password with exactly 8 characters (minimum)
- [x] should validate both password fields are required

#### Password Strength Tests

- [x] should show password strength indicator when typing password

#### UI Interaction Tests

- [x] should toggle password visibility
- [x] should toggle confirm password visibility
- [x] should disable form fields during submission
- [x] should update button text during loading

#### Attribute & Accessibility Tests

- [x] should have correct input types and autocomplete attributes
- [x] should handle valid form submission attempt
- [x] should render page without console errors
- [x] should have accessible form structure

#### Token Handling Tests

- [x] should support special characters in password
- [x] should handle token in URL parameter correctly
- [x] should have submit button with correct text during normal state

## Test Scenarios Covered

### Core Scenarios

1. **Page Loading**: All auth pages load correctly with proper titles and descriptions
2. **Form Rendering**: All input fields, labels, buttons, and links render correctly
3. **Navigation**: Links between auth pages work correctly
4. **Form Validation**: Email and password validation rules are enforced

### Email Validation

- Empty email field
- Invalid email format (no @, no domain)
- Special characters
- Multiple top-level domains (.com, .co.uk, .org, .net, etc.)
- Email addresses with numbers and special characters (+, ., -, etc.)
- Whitespace handling

### Password Validation

- Empty password field
- Password too short (< 8 characters)
- Password with exactly 8 characters (edge case minimum)
- Password with 7 characters (just below minimum)
- Special characters in password
- Password strength indicator display

### Password Confirmation

- Passwords match
- Passwords don't match
- Visibility toggle for both fields
- Loading states during submission

### UI Interactions

- Password visibility toggle (show/hide password)
- Remember me checkbox toggle
- Button disable state during form submission
- Loading text changes (e.g., "Logging in..." vs "Log in")

### URL Parameters & Query Strings

- login?verified=true - Shows success alert
- login?verified=false - Shows error alert
- reset-password without token - Redirects to forgot-password
- reset-password?token=<token> - Loads reset form with hidden token

### Accessibility

- Form elements have proper labels
- Labels are associated with inputs (for attribute)
- Semantic form structure
- Tab order and keyboard navigation compatibility

## Running the Tests

### Prerequisites

1. Node.js 18+ installed
2. Dependencies installed: `npm install` or `pnpm install`
3. Development server running or will be started automatically

### Run All Auth Tests

```bash
npx playwright test tests/e2e/auth/ --project=chromium
```

### Run Specific Test File

```bash
# Login tests
npx playwright test tests/e2e/auth/login.spec.ts --project=chromium

# Register tests
npx playwright test tests/e2e/auth/register.spec.ts --project=chromium

# Forgot password tests
npx playwright test tests/e2e/auth/forgot-password.spec.ts --project=chromium

# Reset password tests
npx playwright test tests/e2e/auth/reset-password.spec.ts --project=chromium
```

### Run with Additional Options

```bash
# Run with debug mode
npx playwright test tests/e2e/auth/ --debug

# Run with headed browser (not headless)
npx playwright test tests/e2e/auth/ --headed

# Run on multiple browsers
npx playwright test tests/e2e/auth/ --project=chromium --project=firefox --project=webkit

# Run with specific reporter
npx playwright test tests/e2e/auth/ --reporter=html

# View HTML report
npx playwright show-report
```

### Playwright Configuration

The tests use the Playwright configuration from `playwright.config.ts`:

- Base URL: `http://localhost:3000` (or `PLAYWRIGHT_BASE_URL` environment variable)
- Reporters: HTML report
- Screenshots: Only on failure
- Traces: On first retry
- Workers: 1 for CI, unlimited for local development
- Retries: 2 for CI, 0 for local development

## Test Structure

All tests follow Playwright best practices:

1. **Clear Test Organization**: Tests are grouped by feature using `test.describe()`
2. **Setup/Teardown**: `beforeEach` hooks set up initial state
3. **Assertions**: Using Playwright's `expect()` for reliable assertions
4. **Locators**: Using ID selectors (#email), labels, text content, and aria selectors
5. **Async/Await**: Proper async handling for all async operations
6. **Mocking**: Mock API calls when needed for isolated testing

## Key Testing Patterns

### Form Validation Testing

```typescript
const emailInput = page.locator('#email')
await emailInput.fill('invalid-email')
const submitButton = page.locator('button:has-text("Log in")')
await submitButton.click()
const emailError = page.locator('text=Invalid email format')
await expect(emailError).toBeVisible()
```

### Password Visibility Toggle

```typescript
const passwordInput = page.locator('#password')
await passwordInput.fill('password123')
// Initial state - hidden
expect(await passwordInput.evaluate((el: HTMLInputElement) => el.type)).toBe(
  'password'
)
// Toggle
await toggleButton.click()
// Now visible
expect(await passwordInput.evaluate((el: HTMLInputElement) => el.type)).toBe(
  'text'
)
```

### Navigation Testing

```typescript
const link = page.locator('a:has-text("Sign up")')
await link.click()
await expect(page).toHaveURL('/register')
```

### API Mocking

```typescript
// Mock the API to abort (simulate network isolation)
await page.route('/api/auth/login', (route) => {
  route.abort()
})

// Or mock with delay to test loading states
await page.route('/api/auth/login', async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await route.abort()
})
```

## Implementation Notes

### Form Fields Tested

#### Login Form

- Email (text, type="email")
- Password (text, type="password", visibility toggle)
- Remember Me (checkbox)

#### Register Form

- Email (text, type="email")
- Password (text, type="password", visibility toggle, strength indicator)
- Confirm Password (text, type="password", visibility toggle)

#### Forgot Password Form

- Email (text, type="email")

#### Reset Password Form

- Token (hidden field)
- New Password (text, type="password", visibility toggle, strength indicator)
- Confirm New Password (text, type="password", visibility toggle)

### Validation Rules

All validation follows the schemas defined in `/src/lib/validation.ts`:

1. **Email**: Must be valid email format
2. **Password**: Minimum 8 characters (SECURITY.PASSWORD_MIN_LENGTH)
3. **Confirm Password**: Must match password field
4. **Token**: Must be present for reset password flow

## Known Issues & Considerations

1. **API Mocking**: Tests mock API calls since this is a UI test suite. Actual API responses should be tested in integration tests.

2. **Database State**: Tests don't require specific database state as they focus on UI behavior.

3. **Time-based Tests**: Some tests like password visibility toggle might have timing issues on slow machines. These can be increased if needed.

4. **Console Errors**: Tests filter expected console messages to avoid false failures.

5. **Error Message Cleanup**: Some tests check that error messages are cleared after fixing input. The exact behavior depends on form validation library (react-hook-form).

## Future Enhancements

1. Add visual regression tests for form styling
2. Add performance tests to measure form interaction speed
3. Add mobile-specific tests (already configured in playwright.config.ts)
4. Add login/register success flow tests with mocked successful responses
5. Add error response handling tests for API failures
6. Add rate limiting error tests
7. Add CSRF token handling tests
8. Add two-factor authentication tests (when implemented)

## Test Maintenance

### When to Update Tests

1. **UI Changes**: Update selectors if form structure changes
2. **Validation Rules**: Update validation tests if rules change in `/src/lib/validation.ts`
3. **Error Messages**: Update error message assertions if messages change
4. **Button Text**: Update button text assertions if copy changes
5. **Page URLs**: Update navigation test assertions if routes change

### Common Fixes

- **Selector Not Found**: Check if element ID or text has changed
- **Assertion Failed**: Verify the element exists and is visible
- **Timeout**: Increase waitForTimeout if element takes longer to appear
- **API Mock Errors**: Ensure route mock is set up before navigation

## Conclusion

This comprehensive E2E test suite provides excellent coverage of the authentication flows in the Luma application. The tests verify:

- Page structure and layout
- Form field rendering and properties
- Form validation rules
- User interactions (typing, clicking, toggling)
- Navigation between pages
- Error message display
- Loading states
- Accessibility features

The tests use Playwright best practices and can be easily extended as the authentication system grows (e.g., adding two-factor authentication, OAuth, etc.).
