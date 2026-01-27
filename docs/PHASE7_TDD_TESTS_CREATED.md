# Phase 7: Admin Dashboard - TDD Test Suite

> **Created**: 2026-01-26
> **Phase**: Phase 7 - Admin Dashboard (ADMIN-001 to ADMIN-019)
> **Status**: Tests Created - Ready for Implementation

---

## Overview

This document describes the comprehensive TDD test suite created for Phase 7: Admin Dashboard. All tests have been written BEFORE implementation to follow Test-Driven Development principles. The tests will initially fail and serve as specifications for the implementation.

---

## Test Coverage Summary

### Total Tests Created: 14 Files

| Category             | File Count | Test Files                                                                                             |
| -------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| **Unit Tests (Lib)** | 1          | admin-auth.test.ts                                                                                     |
| **API Tests**        | 9          | login, logout, auth, stats, access-stats, cost, cost-mathpix, workers, users, users-quota, users-files |
| **Component Tests**  | 1          | admin-login-form.test.tsx                                                                              |
| **E2E Tests**        | 3          | admin-login, admin-dashboard, admin-users                                                              |

---

## Test Files Created

### 1. Unit Tests - Library

#### `/tests/lib/admin-auth.test.ts`

**Purpose**: Tests for admin authentication utilities

**Test Coverage**:

- `getAdminSession()` - Session retrieval from cookies
  - Returns null when no session exists
  - Returns admin data for valid session
  - Handles expired sessions
  - Validates session integrity
  - Checks luma-admin-session cookie specifically
  - Rejects disabled admin accounts
- `requireAdmin()` - Admin authentication enforcement
  - Returns admin for authenticated requests
  - Throws 401 for unauthenticated
  - Throws 403 for disabled admin
  - Accepts both ADMIN and SUPER_ADMIN roles
- `requireSuperAdmin()` - Super admin enforcement
  - Returns super admin for authorized requests
  - Throws 403 for regular admin role
  - Only accepts SUPER_ADMIN role
- `setAdminSession()` - Session creation
  - Sets httpOnly cookie with 24-hour expiry
  - Uses secure flag in production
  - Sets correct sameSite attribute
- `clearAdminSession()` - Session cleanup
  - Deletes admin session cookie
  - Clears session from storage
- Security validations
  - Session isolation from user sessions
  - Password hash not included in session
  - Proper error handling

**Key Assertions**: 40+ test cases covering all admin auth utilities

---

### 2. API Tests

#### `/tests/api/admin/login.test.ts`

**Purpose**: Admin login endpoint tests

**Test Coverage**:

- Happy path: Successful login with correct credentials
- Cookie management: httpOnly, 24-hour expiry, secure flags
- Audit logging: Login attempt logging with metadata
- Invalid credentials: Wrong password, non-existent email
- Disabled accounts: Proper error messages
- Validation: Email format, required fields
- Security: No password hash exposure, timing attack protection, rate limiting
- Account lockout: Not applicable (admin-specific behavior)
- Edge cases: Case-insensitive email, whitespace trimming, concurrent requests

**Key Assertions**: 50+ test cases

---

#### `/tests/api/admin/logout.test.ts`

**Purpose**: Admin logout endpoint tests

**Test Coverage**:

- Happy path: Successful logout
- Cookie clearing: Max-Age=0, proper path
- Session destruction
- Authentication requirements
- Audit logging
- Idempotency: Multiple logout attempts
- Cookie flags: httpOnly, secure, path

**Key Assertions**: 15+ test cases

---

#### `/tests/api/admin/auth.test.ts`

**Purpose**: Admin authentication check endpoint tests

**Test Coverage**:

- Happy path: Returns admin info when authenticated
- Role information: ADMIN vs SUPER_ADMIN
- Unauthenticated access: 401 responses
- Disabled admin: 403 responses
- Security: No sensitive data exposure
- Response format validation

**Key Assertions**: 12+ test cases

---

#### `/tests/api/admin/stats.test.ts`

**Purpose**: System statistics API tests

**Test Coverage**:

- Authentication: Admin access required
- Metrics returned:
  - Total users count
  - Total courses count
  - Total files count
  - Total storage used (BigInt handling)
  - Active users (last 7 days)
  - New users this month
  - Files processing count
- Response format validation
- Performance: Handles large datasets efficiently
- Edge cases: Empty database returns zeros

**Key Assertions**: 15+ test cases

---

#### `/tests/api/admin/access-stats.test.ts`

**Purpose**: User access statistics API tests

**Test Coverage**:

- Total page views tracking
- Q&A usage count
- Explain usage count
- Timeline data with date grouping
- Breakdown by action type
- Query parameters: period filtering (7d, 30d), groupBy (day, month)
- Response format validation
- Edge cases: Empty logs, invalid parameters

**Key Assertions**: 15+ test cases

---

#### `/tests/api/admin/cost.test.ts`

**Purpose**: AI cost monitoring API tests

**Test Coverage**:

- Total input/output tokens
- Estimated cost calculation
- Breakdown by model
- Daily trend data
- Period filtering (7d, 30d)
- Response format validation
- Edge cases: Zero values, large token counts

**Key Assertions**: 13+ test cases

---

#### `/tests/api/admin/cost-mathpix.test.ts`

**Purpose**: Mathpix cost tracking API tests

**Test Coverage**:

- Total requests count
- Estimated cost ($0.004 per request)
- Top users by usage
- Daily trend data
- Response format validation
- Edge cases: No usage, large request counts

**Key Assertions**: 10+ test cases

---

#### `/tests/api/admin/workers.test.ts`

**Purpose**: Worker health monitoring API tests

**Test Coverage**:

- Summary with job counts (active, pending, failed, zombie)
- Zombie job detection (>10 minutes processing)
- Jobs list with metadata
- Job details: fileId, fileName, status, startedAt, duration
- Failed job error messages
- Response format validation
- Performance: Handles many jobs efficiently

**Key Assertions**: 12+ test cases

---

#### `/tests/api/admin/users.test.ts`

**Purpose**: User list API tests

**Test Coverage**:

- User list with details (email, role, dates, locked status)
- Quota summary per user
- Course count per user
- Pagination: page, pageSize, total, totalPages
- Search: by email, case-insensitive
- Sorting: by creation date (newest first)
- Security: No password hashes or sensitive data
- Response format validation

**Key Assertions**: 20+ test cases

---

#### `/tests/api/admin/users-quota.test.ts`

**Purpose**: User quota adjustment API tests

**Test Coverage**:

- Set limit action: Update quota limit
- Adjust used action: Positive/negative adjustments
- Reset action: Reset used to 0
- Logging: QuotaLog and AuditLog entries
- Validation: Invalid bucket/action, required reason, negative values
- Response format: Returns updated quota
- Edge cases: Non-existent user

**Key Assertions**: 18+ test cases

---

#### `/tests/api/admin/users-files.test.ts`

**Purpose**: User file statistics API tests

**Test Coverage**:

- User email and ID
- Summary: totalFiles, totalStorage, totalPages, filesByStatus
- Breakdown by course
- Upload timeline data
- Response format validation
- Edge cases: No files, non-existent user, many files

**Key Assertions**: 12+ test cases

---

### 3. Component Tests

#### `/tests/components/admin/admin-login-form.test.tsx`

**Purpose**: Admin login form component tests

**Test Coverage**:

- Rendering: Email/password fields, no remember me, no forgot password/register links
- Admin branding: Distinct from user login
- User interactions: Typing, password visibility toggle
- Validation: Email format, required fields, error clearing
- Form submission: onSubmit callback, loading state, disabled fields, prevent multiple submissions
- Error handling: Invalid credentials, disabled account, network errors, form re-enabling
- Accessibility: Proper labels, aria-live, keyboard navigation, Enter key submission
- Security: Autocomplete attributes, password input type

**Key Assertions**: 40+ test cases

---

### 4. E2E Tests

#### `/tests/e2e/admin-login.spec.ts`

**Purpose**: Admin login page and flow E2E tests

**Test Coverage**:

- Page loading: Title, heading, admin branding
- Form display: Email/password fields, no remember me/forgot password
- Validation: Empty fields, invalid email
- Password visibility toggle
- Form submission: Loading state, button disabled
- Error handling: Invalid credentials, disabled account
- Success flow: Redirect to dashboard, cookie set
- Security: Input attributes, autocomplete
- Authenticated redirect: Already logged in admins redirected
- Accessibility: Form structure, keyboard navigation, Enter key
- Console errors check

**Key Assertions**: 25+ test cases

---

#### `/tests/e2e/admin-dashboard.spec.ts`

**Purpose**: Admin dashboard navigation and overview E2E tests

**Test Coverage**:

- Authentication: Redirect unauthenticated to login
- Layout: Sidebar, header, logout button, admin info display
- Navigation: Overview, cost, workers, users pages, active item highlight
- System overview: Stats display (users, courses, files, storage, active users)
- Logout: Redirect to login, cookie cleared
- Responsive design: Mobile, tablet layouts, menu toggle
- Performance: Load time, no console errors
- Accessibility: Navigation, main content, keyboard support, heading hierarchy
- Data loading: Loading states, error handling
- Admin role display: Role badge, super admin distinction

**Key Assertions**: 35+ test cases

---

#### `/tests/e2e/admin-users.spec.ts`

**Purpose**: User management page and flows E2E tests

**Test Coverage**:

- User list: Table display, columns (email, role, created, quota)
- Search: Filter by email, no results message, clear search
- Pagination: Controls, page navigation, total count
- User actions: View details, manage quota, view files
- Quota management:
  - Form display, quota buckets
  - Current usage display
  - Action selection, reason requirement
  - Confirmation dialog
  - Adjustment history
- File statistics:
  - Summary display
  - By course breakdown
  - Upload timeline chart
  - By status breakdown
- Responsive design: Mobile/tablet adaptation
- Loading states: Skeleton loaders
- Error handling: API failures, empty states
- Accessibility: Table structure, search input, keyboard navigation

**Key Assertions**: 45+ test cases

---

## Test Execution

### Running Tests

```bash
# Run all unit and API tests
npm run test

# Run specific test file
npm run test tests/lib/admin-auth.test.ts

# Run all admin API tests
npm run test tests/api/admin

# Run component tests
npm run test tests/components/admin

# Run E2E tests
npm run test:e2e tests/e2e/admin-login.spec.ts
npm run test:e2e tests/e2e/admin-dashboard.spec.ts
npm run test:e2e tests/e2e/admin-users.spec.ts

# Run all E2E admin tests
npm run test:e2e tests/e2e/admin-*.spec.ts

# Run with coverage
npm run test -- --coverage
```

---

## Expected Test Behavior

### Before Implementation

- **All tests will FAIL** - This is expected and correct for TDD
- Tests serve as specifications for implementation
- Each test describes exact expected behavior

### During Implementation

- Tests gradually turn green as features are implemented
- Failing tests guide what to implement next
- Passing tests confirm correct implementation

### After Implementation

- **All tests should PASS**
- Green test suite confirms Phase 7 completion
- Tests serve as regression protection

---

## Test Patterns Used

### 1. API Test Pattern

```typescript
describe('POST /api/admin/endpoint', () => {
  beforeEach(async () => {
    // Setup: Clean database, create test data
  })

  afterEach(async () => {
    // Teardown: Clean up test data
  })

  describe('Happy Path', () => {
    // Test successful scenarios
  })

  describe('Authentication', () => {
    // Test auth requirements
  })

  describe('Validation', () => {
    // Test input validation
  })

  describe('Security', () => {
    // Test security aspects
  })

  describe('Edge Cases', () => {
    // Test boundary conditions
  })
})
```

### 2. Component Test Pattern

```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    // Test what renders
  })

  describe('User Interactions', () => {
    // Test user actions
  })

  describe('Validation', () => {
    // Test form validation
  })

  describe('Form Submission', () => {
    // Test submission behavior
  })

  describe('Error Handling', () => {
    // Test error scenarios
  })

  describe('Accessibility', () => {
    // Test a11y features
  })
})
```

### 3. E2E Test Pattern

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page, context }) => {
    // Setup: Auth cookies, navigation
  })

  test('should do something', async ({ page }) => {
    // Arrange: Setup preconditions
    // Act: Perform actions
    // Assert: Verify outcomes
  })
})
```

---

## Integration with Existing Test Suite

### Test Setup (`tests/setup.ts`)

- Already configured with Vitest globals
- Mocks for Next.js, Prisma, Supabase
- Mock helpers: mockUser, mockCourse, mockFile
- **New mock needed**: `mockAdmin` (to be added during implementation)

### Test Configuration

- **Vitest**: Configured in `vitest.config.ts`
- **Playwright**: Configured in `playwright.config.ts`
- Path aliases: `@/` resolves to `src/`
- Coverage thresholds defined

---

## Key Testing Principles Applied

1. **Test Independence**: Each test can run in isolation
2. **Descriptive Names**: Test names describe expected behavior
3. **Arrange-Act-Assert**: Clear test structure
4. **Mocking**: External dependencies mocked (Prisma, cookies, etc.)
5. **Edge Cases**: Boundary conditions tested
6. **Security**: Password hashes never exposed, auth properly tested
7. **Accessibility**: A11y features tested in component and E2E tests
8. **Performance**: Response time assertions for critical operations

---

## Admin-Specific Test Considerations

### Security Focus

- Separate session cookie (`luma-admin-session`)
- Shorter session duration (24 hours vs 7 days)
- Audit logging for all admin actions
- No "remember me" functionality
- No password reset flow (managed by super admin)

### Authentication Isolation

- Admin auth completely separate from user auth
- Different middleware handling
- Different error codes (ADMIN*\* vs AUTH*\*)
- No social login or registration

### Role-Based Testing

- Tests distinguish between ADMIN and SUPER_ADMIN
- Some operations require SUPER_ADMIN role
- Role badges and permissions tested

---

## Coverage Metrics Goals

| Metric                 | Target | Notes                         |
| ---------------------- | ------ | ----------------------------- |
| **Line Coverage**      | >80%   | All critical paths covered    |
| **Branch Coverage**    | >75%   | All conditional logic tested  |
| **Function Coverage**  | >85%   | All exported functions tested |
| **Statement Coverage** | >80%   | All statements executed       |

---

## Next Steps for Implementation

1. **Start with Unit Tests** (`tests/lib/admin-auth.test.ts`)
   - Implement `src/lib/admin-auth.ts`
   - Get unit tests passing first

2. **Implement API Endpoints** (in order)
   - `/api/admin/login` → `tests/api/admin/login.test.ts`
   - `/api/admin/logout` → `tests/api/admin/logout.test.ts`
   - `/api/admin/auth` → `tests/api/admin/auth.test.ts`
   - Continue with stats, monitoring, and user management endpoints

3. **Build UI Components**
   - `admin-login-form.tsx` → `tests/components/admin/admin-login-form.test.tsx`
   - Other admin components as needed

4. **Create Pages**
   - Follow E2E tests as specifications
   - `admin/login/page.tsx` → `tests/e2e/admin-login.spec.ts`
   - `admin/page.tsx` → `tests/e2e/admin-dashboard.spec.ts`
   - `admin/users/page.tsx` → `tests/e2e/admin-users.spec.ts`

5. **Run Tests Continuously**
   - Use `npm run test -- --watch` during development
   - Fix failures as you implement
   - Commit only when tests pass

---

## Constants to Add

Add these to `src/lib/constants.ts`:

```typescript
export const ADMIN_SECURITY = {
  SESSION_COOKIE_NAME: 'luma-admin-session',
  SESSION_MAX_AGE_DAYS: 1, // 24 hours
} as const

export const ADMIN_ERROR_CODES = {
  ADMIN_UNAUTHORIZED: 'ADMIN_UNAUTHORIZED',
  ADMIN_FORBIDDEN: 'ADMIN_FORBIDDEN',
  ADMIN_DISABLED: 'ADMIN_DISABLED',
  ADMIN_INVALID_CREDENTIALS: 'ADMIN_INVALID_CREDENTIALS',
} as const
```

---

## Validation Schemas to Add

Add these to `src/lib/validation.ts`:

```typescript
export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const quotaAdjustmentSchema = z.object({
  bucket: z.enum(['LEARNING_INTERACTIONS', 'AUTO_EXPLAIN']),
  action: z.enum(['set_limit', 'adjust_used', 'reset']),
  value: z.number().min(0).optional(),
  reason: z.string().min(1, 'Reason is required'),
})
```

---

## Summary

**Total Test Cases**: 300+ comprehensive test cases across all categories

**Test Files Created**: 14 files covering:

- 1 utility library
- 9 API endpoints
- 1 UI component
- 3 complete user flows

**Coverage**: Every task from ADMIN-001 to ADMIN-019 has corresponding tests

**Status**: ✅ Ready for TDD implementation

All tests are written, documented, and ready to guide Phase 7 implementation. The test suite ensures that the admin dashboard will be:

- Secure (separate auth, audit logging, no sensitive data exposure)
- Functional (all CRUD operations work correctly)
- User-friendly (proper validation, error messages, loading states)
- Accessible (keyboard navigation, screen reader support)
- Performant (response time checks, efficient queries)

The tests will fail initially (red) and should gradually turn green as implementation progresses, following the TDD red-green-refactor cycle.
