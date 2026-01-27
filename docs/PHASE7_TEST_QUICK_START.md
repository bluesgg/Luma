# Phase 7: Admin Dashboard - Test Quick Start Guide

> Quick reference for running Phase 7 TDD tests

---

## Test Files Overview

```
tests/
├── lib/
│   └── admin-auth.test.ts                    # Admin auth utilities
├── api/
│   └── admin/
│       ├── login.test.ts                     # Login endpoint
│       ├── logout.test.ts                    # Logout endpoint
│       ├── auth.test.ts                      # Auth check endpoint
│       ├── stats.test.ts                     # System stats
│       ├── access-stats.test.ts              # Access analytics
│       ├── cost.test.ts                      # AI cost monitoring
│       ├── cost-mathpix.test.ts              # Mathpix cost
│       ├── workers.test.ts                   # Worker health
│       ├── users.test.ts                     # User list
│       ├── users-quota.test.ts               # Quota adjustment
│       └── users-files.test.ts               # User file stats
├── components/
│   └── admin/
│       └── admin-login-form.test.tsx         # Login form component
└── e2e/
    ├── admin-login.spec.ts                   # Login flow
    ├── admin-dashboard.spec.ts               # Dashboard navigation
    └── admin-users.spec.ts                   # User management
```

---

## Quick Commands

### Run All Phase 7 Tests

```bash
# All unit and API tests
npm run test -- tests/lib/admin-auth.test.ts tests/api/admin tests/components/admin

# All E2E tests
npm run test:e2e tests/e2e/admin-*.spec.ts
```

### Run by Category

```bash
# Unit tests only
npm run test tests/lib/admin-auth.test.ts

# API tests only
npm run test tests/api/admin

# Component tests only
npm run test tests/components/admin

# E2E tests only
npm run test:e2e tests/e2e/admin-*.spec.ts
```

### Run Specific Test Files

```bash
# Admin auth utilities
npm run test tests/lib/admin-auth.test.ts

# Login API
npm run test tests/api/admin/login.test.ts

# Admin login form
npm run test tests/components/admin/admin-login-form.test.tsx

# Login E2E flow
npm run test:e2e tests/e2e/admin-login.spec.ts
```

### Watch Mode (Development)

```bash
# Watch all admin tests
npm run test -- --watch tests/lib/admin-auth.test.ts tests/api/admin tests/components/admin

# Watch specific file
npm run test -- --watch tests/api/admin/login.test.ts
```

### Coverage Reports

```bash
# Run with coverage
npm run test -- --coverage tests/lib/admin-auth.test.ts tests/api/admin tests/components/admin

# Open HTML coverage report
open coverage/index.html
```

---

## Test Execution Order (Recommended for TDD)

### Step 1: Unit Tests First

```bash
npm run test tests/lib/admin-auth.test.ts
```

**Implement**: `src/lib/admin-auth.ts`

### Step 2: API Tests (Core Auth)

```bash
npm run test tests/api/admin/login.test.ts
npm run test tests/api/admin/logout.test.ts
npm run test tests/api/admin/auth.test.ts
```

**Implement**:

- `src/app/api/admin/login/route.ts`
- `src/app/api/admin/logout/route.ts`
- `src/app/api/admin/auth/route.ts`

### Step 3: API Tests (Monitoring)

```bash
npm run test tests/api/admin/stats.test.ts
npm run test tests/api/admin/access-stats.test.ts
npm run test tests/api/admin/cost.test.ts
npm run test tests/api/admin/cost-mathpix.test.ts
npm run test tests/api/admin/workers.test.ts
```

**Implement**: Dashboard stats and monitoring endpoints

### Step 4: API Tests (User Management)

```bash
npm run test tests/api/admin/users.test.ts
npm run test tests/api/admin/users-quota.test.ts
npm run test tests/api/admin/users-files.test.ts
```

**Implement**: User management endpoints

### Step 5: Component Tests

```bash
npm run test tests/components/admin/admin-login-form.test.tsx
```

**Implement**: `src/components/admin/admin-login-form.tsx`

### Step 6: E2E Tests

```bash
npm run test:e2e tests/e2e/admin-login.spec.ts
npm run test:e2e tests/e2e/admin-dashboard.spec.ts
npm run test:e2e tests/e2e/admin-users.spec.ts
```

**Implement**: Complete pages and flows

---

## Expected Test Results

### Before Implementation (All Red ❌)

```
 ❌ tests/lib/admin-auth.test.ts (40 tests failed)
 ❌ tests/api/admin/login.test.ts (50 tests failed)
 ❌ tests/api/admin/logout.test.ts (15 tests failed)
 ... etc
```

### During Implementation (Mixed)

```
 ✅ tests/lib/admin-auth.test.ts (40 tests passed)
 ⚠️  tests/api/admin/login.test.ts (25 passed, 25 failed)
 ❌ tests/api/admin/logout.test.ts (15 tests failed)
 ... etc
```

### After Implementation (All Green ✅)

```
 ✅ tests/lib/admin-auth.test.ts (40 tests passed)
 ✅ tests/api/admin/login.test.ts (50 tests passed)
 ✅ tests/api/admin/logout.test.ts (15 tests passed)
 ... etc

 Total: 300+ tests passed
```

---

## Debugging Failed Tests

### View Detailed Error Messages

```bash
npm run test tests/api/admin/login.test.ts -- --reporter=verbose
```

### Run Single Test Case

```bash
npm run test tests/api/admin/login.test.ts -- -t "should login with correct credentials"
```

### Debug with Node Inspector

```bash
node --inspect-brk node_modules/.bin/vitest tests/api/admin/login.test.ts
```

### E2E Debug Mode

```bash
npm run test:e2e tests/e2e/admin-login.spec.ts -- --debug
```

### E2E Headed Mode (see browser)

```bash
npm run test:e2e tests/e2e/admin-login.spec.ts -- --headed
```

---

## Common Issues and Solutions

### Issue: Tests can't find modules

**Solution**: Check path aliases in `tsconfig.json`

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Issue: Database errors in tests

**Solution**: Ensure `DATABASE_URL` is set in test environment

```bash
export DATABASE_URL="postgresql://test:test@localhost:5432/test"
npm run test
```

### Issue: E2E tests timing out

**Solution**: Increase timeout in `playwright.config.ts`

```typescript
use: {
  timeout: 30000, // 30 seconds
}
```

### Issue: Mock not working

**Solution**: Clear mocks in `beforeEach`

```typescript
beforeEach(() => {
  vi.clearAllMocks()
})
```

---

## Test Data Setup

### Mock Admin User

```typescript
const mockAdmin = {
  id: 'admin-1',
  email: 'admin@luma.com',
  passwordHash: '$2b$10$hashedpassword',
  role: 'ADMIN',
  createdAt: new Date(),
  disabledAt: null,
}
```

### Mock Super Admin

```typescript
const mockSuperAdmin = {
  id: 'super-1',
  email: 'super@luma.com',
  passwordHash: '$2b$10$hashedpassword',
  role: 'SUPER_ADMIN',
  createdAt: new Date(),
  disabledAt: null,
}
```

### Admin Session Cookie

```typescript
// For E2E tests
await context.addCookies([
  {
    name: 'luma-admin-session',
    value: 'valid-token',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
  },
])
```

---

## Continuous Integration

### GitHub Actions Workflow (Example)

```yaml
name: Phase 7 Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit and API tests
        run: npm run test tests/lib/admin-auth.test.ts tests/api/admin tests/components/admin

      - name: Run E2E tests
        run: npm run test:e2e tests/e2e/admin-*.spec.ts

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Success Criteria

Phase 7 tests are considered complete when:

- ✅ All 300+ test cases pass
- ✅ No console errors in E2E tests
- ✅ Code coverage >80% for admin modules
- ✅ All API endpoints return correct responses
- ✅ All UI components render without errors
- ✅ All user flows complete successfully
- ✅ Security tests pass (no sensitive data exposure)
- ✅ Performance tests pass (response times <5s)

---

## Quick Test Checklist

Use this checklist during implementation:

```
Unit Tests:
□ admin-auth.test.ts (40 tests)

API Tests:
□ login.test.ts (50 tests)
□ logout.test.ts (15 tests)
□ auth.test.ts (12 tests)
□ stats.test.ts (15 tests)
□ access-stats.test.ts (15 tests)
□ cost.test.ts (13 tests)
□ cost-mathpix.test.ts (10 tests)
□ workers.test.ts (12 tests)
□ users.test.ts (20 tests)
□ users-quota.test.ts (18 tests)
□ users-files.test.ts (12 tests)

Component Tests:
□ admin-login-form.test.tsx (40 tests)

E2E Tests:
□ admin-login.spec.ts (25 tests)
□ admin-dashboard.spec.ts (35 tests)
□ admin-users.spec.ts (45 tests)

Total: 300+ tests
```

---

## Additional Resources

- **Full Test Documentation**: `docs/PHASE7_TDD_TESTS_CREATED.md`
- **Implementation Plan**: `docs/PHASE7_PLAN.md`
- **Task Requirements**: `docs/task.md` (Phase 7 section)
- **Existing Test Patterns**: `tests/api/auth/login.test.ts` (reference)

---

## Support

If you encounter issues:

1. Check test output for specific error messages
2. Verify mock setup in `tests/setup.ts`
3. Review existing passing tests for patterns
4. Ensure all dependencies are installed (`npm install`)
5. Check that database is accessible (if using real DB)

Happy testing! 🎯
