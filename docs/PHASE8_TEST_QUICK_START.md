# Phase 8: PDF Reader - Test Quick Start Guide

> **Purpose**: Quick reference for running Phase 8 TDD tests
> **Created**: 2026-01-27

---

## Test Files Overview

| Test Type | File | Purpose | Test Count |
|-----------|------|---------|------------|
| API | `tests/api/files/[id]/progress.test.ts` | Reading progress API endpoints | ~210 |
| Hook | `tests/hooks/use-reading-progress.test.ts` | useReadingProgress hook with debouncing | ~150 |
| Component | `tests/components/reader/pdf-viewer.test.tsx` | PDF viewer component | ~200 |
| E2E | `tests/e2e/reader.spec.ts` | Complete reader page flow | ~80 |

---

## Run Individual Test Suites

### API Tests (Reading Progress)
```bash
# Run API tests
npm test -- tests/api/files/\[id\]/progress.test.ts

# Watch mode
npm test -- tests/api/files/\[id\]/progress.test.ts --watch

# Verbose output
npm test -- tests/api/files/\[id\]/progress.test.ts --verbose
```

**What's tested**:
- GET `/api/files/:id/progress` - Fetch current page
- PATCH `/api/files/:id/progress` - Update current page
- Authentication & authorization
- Validation (page range 1-500)
- Upsert behavior
- Error handling

### Hook Tests (useReadingProgress)
```bash
# Run hook tests
npm test -- tests/hooks/use-reading-progress.test.ts

# Watch mode
npm test -- tests/hooks/use-reading-progress.test.ts --watch
```

**What's tested**:
- Immediate local state updates
- Debounced server updates (300ms)
- Query caching (30s stale time)
- Loading and saving states
- Error handling
- FileId changes

### Component Tests (PDF Viewer)
```bash
# Run component tests
npm test -- tests/components/reader/pdf-viewer.test.tsx

# Watch mode
npm test -- tests/components/reader/pdf-viewer.test.tsx --watch
```

**What's tested**:
- PDF rendering and loading
- Page navigation (buttons, keyboard, input)
- Zoom controls (50%-200%)
- Rotation and fullscreen
- Keyboard shortcuts
- Error handling
- Accessibility

### E2E Tests (Reader Page)
```bash
# Run E2E tests
npm run test:e2e -- tests/e2e/reader.spec.ts

# Watch mode
npm run test:e2e -- tests/e2e/reader.spec.ts --watch

# Headed mode (see browser)
npm run test:e2e -- tests/e2e/reader.spec.ts --headed

# Debug mode
npm run test:e2e -- tests/e2e/reader.spec.ts --debug
```

**What's tested**:
- Complete reader page flow
- PDF display and navigation
- Zoom and rotation
- Progress persistence
- Sidebar toggle
- Responsive layout
- Download and learning

---

## Run All Phase 8 Tests

```bash
# Run all Phase 8 tests
npm test -- tests/api/files/\[id\]/progress.test.ts tests/hooks/use-reading-progress.test.ts tests/components/reader/pdf-viewer.test.tsx

# Run E2E separately
npm run test:e2e -- tests/e2e/reader.spec.ts

# Or use grep (if test names include "READER-")
npm test -- --grep "READER-"
```

---

## Expected Results (Before Implementation)

### Initial State: ALL TESTS SHOULD FAIL ❌

This is expected! TDD means writing tests first, then implementing the code.

**Example output**:
```
FAIL  tests/api/files/[id]/progress.test.ts
  ❌ GET /api/files/[id]/progress
    ❌ should return existing progress for user
    ❌ should return default page 1 if no progress exists
  ❌ PATCH /api/files/[id]/progress
    ❌ should update existing progress
    ❌ should create progress if none exists (upsert)

FAIL  tests/hooks/use-reading-progress.test.ts
  ❌ useReadingProgress Hook
    ❌ should return loading state initially
    ❌ should update local state immediately

FAIL  tests/components/reader/pdf-viewer.test.tsx
  ❌ PdfViewer Component
    ❌ should render loading skeleton initially
    ❌ should render PDF document on load success

FAIL  tests/e2e/reader.spec.ts
  ❌ PDF Reader Page
    ❌ should load reader page for valid file ID
    ❌ should display PDF viewer

Test Suites: 4 failed, 0 passed, 4 total
Tests:       ~640 failed, 0 passed, ~640 total
```

This is **CORRECT** for TDD! ✅

---

## Implementation Workflow

### Step 1: Implement API Layer
```bash
# 1. Create progress API route
touch src/app/api/files/[id]/progress/route.ts

# 2. Create API client functions
touch src/lib/api/progress.ts

# 3. Run tests until they pass
npm test -- tests/api/files/\[id\]/progress.test.ts --watch
```

**Goal**: All API tests passing ✅

### Step 2: Implement Hook Layer
```bash
# 1. Install dependencies
npm install use-debounce

# 2. Create hook
touch src/hooks/use-reading-progress.ts

# 3. Run tests until they pass
npm test -- tests/hooks/use-reading-progress.test.ts --watch
```

**Goal**: All hook tests passing ✅

### Step 3: Implement Component Layer
```bash
# 1. Install dependencies
npm install react-pdf

# 2. Create components
touch src/components/reader/pdf-viewer.tsx
touch src/components/reader/pdf-toolbar.tsx
touch src/components/reader/pdf-page.tsx
touch src/components/reader/pdf-loading-skeleton.tsx

# 3. Run tests until they pass
npm test -- tests/components/reader/pdf-viewer.test.tsx --watch
```

**Goal**: All component tests passing ✅

### Step 4: Implement Page Layer
```bash
# 1. Create page and layouts
touch src/app/\(main\)/reader/[fileId]/page.tsx
touch src/components/reader/reader-header.tsx
touch src/components/reader/explanation-sidebar.tsx

# 2. Run E2E tests
npm run test:e2e -- tests/e2e/reader.spec.ts --watch
```

**Goal**: All E2E tests passing ✅

---

## Debugging Failed Tests

### API Tests
```bash
# Run specific test
npm test -- tests/api/files/\[id\]/progress.test.ts -t "should return existing progress"

# Check API route implementation
cat src/app/api/files/[id]/progress/route.ts
```

### Hook Tests
```bash
# Run specific test
npm test -- tests/hooks/use-reading-progress.test.ts -t "should update local state"

# Check hook implementation
cat src/hooks/use-reading-progress.ts
```

### Component Tests
```bash
# Run specific test
npm test -- tests/components/reader/pdf-viewer.test.tsx -t "should navigate to next page"

# Check component
cat src/components/reader/pdf-viewer.tsx
```

### E2E Tests
```bash
# Run specific test
npm run test:e2e -- tests/e2e/reader.spec.ts -g "should load reader page"

# Run in headed mode to see browser
npm run test:e2e -- tests/e2e/reader.spec.ts --headed

# Take screenshots on failure
npm run test:e2e -- tests/e2e/reader.spec.ts --screenshot=on
```

---

## Test Coverage

After implementation, check coverage:

```bash
# Run with coverage
npm test -- --coverage

# Check specific files
npm test -- tests/api/files/\[id\]/progress.test.ts --coverage
```

**Target**: >80% coverage for all modules

---

## Common Issues

### Issue: Module not found errors
```bash
# Solution: Create placeholder implementations
touch src/lib/api/progress.ts
touch src/hooks/use-reading-progress.ts
touch src/components/reader/pdf-viewer.tsx
```

### Issue: react-pdf import errors
```bash
# Solution: Install react-pdf
npm install react-pdf

# Configure worker
# Add to component:
import { pdfjs } from 'react-pdf'
pdfjs.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
```

### Issue: Debounce not working in tests
```bash
# Solution: Use fake timers in tests
vi.useFakeTimers()
act(() => {
  vi.advanceTimersByTime(300)
})
vi.useRealTimers()
```

### Issue: E2E tests timeout
```bash
# Solution: Increase timeout
test('test name', async ({ page }) => {
  test.setTimeout(60000) // 60 seconds
  // test code
})
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Phase 8 Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- tests/api/files/\[id\]/progress.test.ts
      - run: npm test -- tests/hooks/use-reading-progress.test.ts
      - run: npm test -- tests/components/reader/pdf-viewer.test.tsx
      - run: npm run test:e2e -- tests/e2e/reader.spec.ts
```

---

## Quick Reference: Test Patterns

### API Test Pattern
```typescript
describe('GET /api/files/[id]/progress', () => {
  it('should return existing progress', async () => {
    const response = await getProgress(fileId)
    expect(response.status).toBe(200)
    expect(response.data.data.currentPage).toBe(15)
  })
})
```

### Hook Test Pattern
```typescript
describe('useReadingProgress', () => {
  it('should update local state immediately', async () => {
    const { result } = renderHook(() => useReadingProgress('file-123'))
    act(() => {
      result.current.setPage(25)
    })
    expect(result.current.currentPage).toBe(25)
  })
})
```

### Component Test Pattern
```typescript
describe('PdfViewer', () => {
  it('should navigate to next page', async () => {
    render(<PdfViewer url={mockUrl} onPageChange={mockFn} />)
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(mockFn).toHaveBeenCalledWith(2)
  })
})
```

### E2E Test Pattern
```typescript
test('should load reader page', async ({ page }) => {
  await page.goto('/reader/file-123')
  await expect(page.locator('[data-testid="pdf-viewer"]')).toBeVisible()
})
```

---

## Summary

1. **Start with API tests** - Build foundation first
2. **Move to hook tests** - Add state management
3. **Build component tests** - Create UI components
4. **Verify with E2E tests** - Test complete flow
5. **All tests should fail initially** - This is TDD! ✅
6. **Implement until tests pass** - Let tests guide development

---

**Next**: Start implementation with API layer (`src/app/api/files/[id]/progress/route.ts`)
