# Phase 10 Tests - Quick Start Guide

## Overview

This guide helps you quickly run and verify all Phase 10 (Deployment and DevOps) tests.

---

## Prerequisites

```bash
# Ensure dependencies are installed
npm install

# Ensure Prisma client is generated
npm run db:generate
```

---

## Running Tests

### Run All Phase 10 Tests

```bash
# Run all Phase 10 tests
npm test tests/lib/sentry.test.ts tests/lib/logger-enhanced.test.ts tests/trigger/client.test.ts tests/trigger/jobs/extract-pdf-structure.test.ts tests/trigger/jobs/quota-reset.test.ts
```

### Run Individual Test Files

```bash
# Sentry Integration Tests (63 test cases)
npm test tests/lib/sentry.test.ts

# Enhanced Logger Tests (48 test cases)
npm test tests/lib/logger-enhanced.test.ts

# Trigger.dev Client Tests (40 test cases)
npm test tests/trigger/client.test.ts

# Extract PDF Structure Job Tests (56 test cases)
npm test tests/trigger/jobs/extract-pdf-structure.test.ts

# Quota Reset Job Tests (61 test cases)
npm test tests/trigger/jobs/quota-reset.test.ts
```

### Run with Coverage

```bash
# All Phase 10 tests with coverage
npm run test:coverage -- tests/lib/sentry.test.ts tests/lib/logger-enhanced.test.ts tests/trigger/client.test.ts tests/trigger/jobs/

# Individual file coverage
npm run test:coverage -- tests/lib/sentry.test.ts
npm run test:coverage -- tests/trigger/jobs/quota-reset.test.ts
```

### Watch Mode (Development)

```bash
# Watch all Phase 10 tests
npm test -- --watch tests/lib/sentry.test.ts tests/lib/logger-enhanced.test.ts tests/trigger/

# Watch specific test file
npm test -- --watch tests/lib/sentry.test.ts
```

---

## Expected Results

### Initial Run (Before Implementation)

All tests should **FAIL** because the features haven't been implemented yet. This is expected in TDD!

```
❌ FAIL tests/lib/sentry.test.ts (63 tests)
❌ FAIL tests/lib/logger-enhanced.test.ts (48 tests)
❌ FAIL tests/trigger/client.test.ts (40 tests)
❌ FAIL tests/trigger/jobs/extract-pdf-structure.test.ts (56 tests)
❌ FAIL tests/trigger/jobs/quota-reset.test.ts (61 tests)

Total: 268 tests (0 passed, 268 failed)
```

### After Implementation

All tests should **PASS**:

```
✓ PASS tests/lib/sentry.test.ts (63 tests)
✓ PASS tests/lib/logger-enhanced.test.ts (48 tests)
✓ PASS tests/trigger/client.test.ts (40 tests)
✓ PASS tests/trigger/jobs/extract-pdf-structure.test.ts (56 tests)
✓ PASS tests/trigger/jobs/quota-reset.test.ts (61 tests)

Total: 268 tests (268 passed, 0 failed)
```

---

## Test File Locations

```
tests/
├── lib/
│   ├── sentry.test.ts              # Sentry integration tests
│   └── logger-enhanced.test.ts     # Enhanced logger tests
└── trigger/
    ├── client.test.ts              # Trigger.dev client tests
    └── jobs/
        ├── extract-pdf-structure.test.ts  # PDF extraction job tests
        └── quota-reset.test.ts            # Quota reset job tests
```

---

## Implementation Files to Create

Based on the tests, you need to implement these files:

```
src/
├── lib/
│   ├── sentry.ts                   # NEW: Sentry configuration
│   └── logger.ts                   # UPDATE: Add enhanced features
├── trigger/
│   ├── client.ts                   # UPDATE: Add v3 configuration
│   └── jobs/
│       ├── extract-pdf-structure.ts  # UPDATE: Full implementation
│       └── quota-reset.ts            # UPDATE: Full implementation
├── sentry.client.config.ts         # NEW: Client-side Sentry
├── sentry.server.config.ts         # NEW: Server-side Sentry
└── sentry.edge.config.ts           # NEW: Edge runtime Sentry
```

---

## TDD Workflow

### Red-Green-Refactor Cycle

1. **RED**: Run tests (they should fail)
   ```bash
   npm test tests/lib/sentry.test.ts
   # ❌ Tests fail - feature not implemented
   ```

2. **GREEN**: Implement feature to make tests pass
   ```typescript
   // Implement /src/lib/sentry.ts based on test requirements
   ```

3. **REFACTOR**: Clean up code while keeping tests passing
   ```bash
   npm test tests/lib/sentry.test.ts
   # ✓ Tests pass - refactor if needed
   ```

---

## Quick Verification Checklist

Run these commands to verify everything is set up correctly:

```bash
# 1. Check Vitest is working
npm test -- --version

# 2. Verify test files exist
ls -la tests/lib/sentry.test.ts
ls -la tests/lib/logger-enhanced.test.ts
ls -la tests/trigger/client.test.ts
ls -la tests/trigger/jobs/extract-pdf-structure.test.ts
ls -la tests/trigger/jobs/quota-reset.test.ts

# 3. Run a simple test to verify setup
npm test tests/lib/sentry.test.ts -- --reporter=verbose

# 4. Check test coverage configuration
cat vitest.config.ts
```

---

## Troubleshooting

### Issue: "Cannot find module '@/lib/sentry'"

**Solution:** The module doesn't exist yet (this is expected in TDD). Create the file:
```bash
touch src/lib/sentry.ts
```

### Issue: "No tests found"

**Solution:** Check test file paths:
```bash
npm test tests/lib/sentry.test.ts -- --reporter=verbose
```

### Issue: Prisma client errors

**Solution:** Regenerate Prisma client:
```bash
npm run db:generate
```

### Issue: Import errors

**Solution:** Verify path aliases in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Test Statistics

| Component | Test Cases | Coverage Areas |
|-----------|-----------|----------------|
| Sentry Integration | 63 | Error tracking, breadcrumbs, user context |
| Enhanced Logger | 48 | Structured logging, Sentry integration |
| Trigger.dev Client | 40 | Configuration, validation |
| PDF Extraction Job | 56 | Payload validation, extraction flow |
| Quota Reset Job | 61 | Date calculation, quota reset |
| **TOTAL** | **268** | **All Phase 10 features** |

---

## Useful Commands

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests in CI mode
npm run test:ci

# Generate coverage report
npm run test:coverage

# Run specific test suite
npm test -- -t "Sentry Integration"

# Run tests matching pattern
npm test -- tests/trigger/

# Run with verbose output
npm test -- --reporter=verbose

# Run with color output disabled
npm test -- --no-color
```

---

## Next Steps

1. ✅ Run all Phase 10 tests (expect failures)
2. ⬜ Implement Sentry integration (`/src/lib/sentry.ts`)
3. ⬜ Update logger (`/src/lib/logger.ts`)
4. ⬜ Update Trigger.dev client (`/src/trigger/client.ts`)
5. ⬜ Implement PDF extraction job
6. ⬜ Implement quota reset job
7. ⬜ Run tests again (expect passes)
8. ⬜ Review coverage report
9. ⬜ Refactor and optimize

---

## Resources

- **Phase 10 Plan:** `/docs/PHASE10_PLAN.md`
- **Test Documentation:** `/docs/PHASE10_TDD_TESTS_CREATED.md`
- **Vitest Docs:** https://vitest.dev
- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Trigger.dev Docs:** https://trigger.dev/docs

---

## Success Criteria

Phase 10 tests are complete when:

- ✅ All 268 tests pass
- ✅ No TypeScript errors
- ✅ Coverage thresholds met (70% lines, 70% functions)
- ✅ All edge cases handled
- ✅ Error scenarios tested
- ✅ Performance considerations validated

---

Happy testing! 🧪
