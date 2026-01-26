# Test Suite Documentation

## Overview

Comprehensive test suite following Test-Driven Development (TDD) methodology for the Luma Web application.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup and mocks
├── unit/                       # Pure unit tests (no dependencies)
├── integration/                # API integration tests
├── hooks/                      # React hooks tests
├── components/                 # React component tests
│   ├── auth/                   # Authentication components
│   ├── course/                 # Course components
│   ├── file/                   # File upload/management components
│   └── ui/                     # UI components
├── pages/                      # Page component tests
├── api/                        # API route tests
├── lib/                        # Library/utility tests
└── e2e/                        # End-to-end tests (Playwright)
```

## Running Tests

### All Tests
```bash
npm test                        # Run all tests once
npm test -- --watch            # Run in watch mode
npm test -- --ui               # Run with UI
```

### Specific Test Files
```bash
npm test -- tests/hooks/use-multi-file-upload.test.ts
npm test -- tests/components/file/
npm test -- tests/api/
```

### Coverage
```bash
npm run test:coverage          # Generate coverage report
npm run test:coverage -- --ui  # View coverage in browser
```

### E2E Tests
```bash
npm run test:e2e              # Run E2E tests
npm run test:e2e:ui           # Run with UI
npm run test:e2e:debug        # Debug mode
```

## Test Categories

### Unit Tests
Test individual functions/modules in isolation.

**Location**: `tests/unit/`, `tests/lib/`

**Example**:
```typescript
import { formatFileSize } from '@/lib/utils'

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
  })
})
```

### Hook Tests
Test React hooks using `@testing-library/react`.

**Location**: `tests/hooks/`

**Example**:
```typescript
import { renderHook, act } from '@testing-library/react'
import { useMultiFileUpload } from '@/hooks/use-multi-file-upload'

describe('useMultiFileUpload', () => {
  it('adds files to queue', () => {
    const { result } = renderHook(() => useMultiFileUpload(courseId, token))

    act(() => {
      result.current.addFiles([file])
    })

    expect(result.current.queue).toHaveLength(1)
  })
})
```

### Component Tests
Test React components with user interactions.

**Location**: `tests/components/`

**Example**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { FileUploadItem } from '@/components/file/file-upload-item'

describe('FileUploadItem', () => {
  it('calls onCancel when clicked', () => {
    const onCancel = vi.fn()
    render(<FileUploadItem item={item} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalledWith(item.id)
  })
})
```

### Integration Tests
Test API routes and database interactions.

**Location**: `tests/integration/`, `tests/api/`

**Example**:
```typescript
import { POST } from '@/app/api/files/upload-url/route'
import { NextRequest } from 'next/server'

describe('POST /api/files/upload-url', () => {
  it('returns signed URL for valid request', async () => {
    const request = new NextRequest('http://localhost/api/files/upload-url', {
      method: 'POST',
      body: JSON.stringify({ courseId, fileName: 'test.pdf', fileSize: 1024 })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.uploadUrl).toBeDefined()
  })
})
```

### E2E Tests
Test complete user flows with Playwright.

**Location**: `tests/e2e/`

**Example**:
```typescript
import { test, expect } from '@playwright/test'

test('user can upload PDF file', async ({ page }) => {
  await page.goto('/courses/123')

  // Upload file
  await page.setInputFiles('input[type="file"]', 'test.pdf')

  // Verify upload
  await expect(page.getByText('Upload complete')).toBeVisible()
})
```

## TDD Workflow

### 1. Write Test First (RED)
```typescript
describe('searchMarkets', () => {
  it('returns semantically similar markets', async () => {
    const results = await searchMarkets('election')

    expect(results).toHaveLength(5)
    expect(results[0].name).toContain('Trump')
  })
})
```

### 2. Run Test (Verify FAIL)
```bash
npm test
# Test should fail - implementation doesn't exist yet
```

### 3. Write Minimal Implementation (GREEN)
```typescript
export async function searchMarkets(query: string) {
  const embedding = await generateEmbedding(query)
  const results = await vectorSearch(embedding)
  return results
}
```

### 4. Run Test (Verify PASS)
```bash
npm test
# Test should now pass
```

### 5. Refactor (IMPROVE)
```typescript
export async function searchMarkets(query: string) {
  // Better error handling
  if (!query) throw new Error('Query required')

  // Cached embedding generation
  const embedding = await getCachedEmbedding(query)

  // Optimized search with limit
  return vectorSearch(embedding, { limit: 5 })
}
```

### 6. Verify Coverage
```bash
npm run test:coverage
# Ensure 80%+ coverage
```

## Mocking

### API Calls
```typescript
global.fetch = vi.fn()

;(global.fetch as any).mockResolvedValueOnce({
  ok: true,
  json: async () => ({ success: true, data: { id: '123' } })
})
```

### Database
```typescript
vi.mock('@/lib/prisma', () => ({
  prisma: {
    file: {
      create: vi.fn(() => Promise.resolve(mockFile))
    }
  }
}))
```

### Authentication
```typescript
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(mockUser))
}))
```

### Environment Variables
```typescript
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
```

## Coverage Requirements

### Per-File Thresholds
| Category | Statements | Branches | Functions | Lines |
|----------|-----------|----------|-----------|-------|
| Critical (auth, payments) | 90% | 85% | 90% | 90% |
| Core (hooks, API) | 85% | 80% | 85% | 85% |
| Components | 80% | 75% | 80% | 80% |
| Utils | 90% | 85% | 90% | 90% |

### Viewing Coverage
```bash
# Generate report
npm run test:coverage

# Open in browser
open coverage/index.html
```

## Best Practices

### ✅ DO
- Write tests before implementation (TDD)
- Test user behavior, not implementation details
- Use descriptive test names
- Keep tests isolated and independent
- Mock external dependencies
- Test edge cases and error paths
- Use `data-testid` for stable selectors
- Follow AAA pattern (Arrange, Act, Assert)

### ❌ DON'T
- Test implementation details (internal state)
- Write tests after implementation
- Make tests depend on each other
- Mock what you're testing
- Use complex setup/teardown
- Skip edge cases
- Use brittle selectors (CSS classes)
- Write one giant test

## Test Patterns

### AAA Pattern
```typescript
it('validates file size', () => {
  // Arrange
  const file = new File(['x'], 'test.pdf', { type: 'application/pdf' })
  Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

  // Act
  const result = validateFile(file)

  // Assert
  expect(result.valid).toBe(true)
})
```

### Given-When-Then (BDD)
```typescript
it('rejects oversized files', () => {
  // Given a file larger than 200MB
  const largeFile = createFile(201 * 1024 * 1024)

  // When validating the file
  const result = validateFile(largeFile)

  // Then it should be rejected
  expect(result.valid).toBe(false)
  expect(result.error).toContain('200 MB')
})
```

## Debugging Tests

### Failed Tests
```bash
# Run specific test
npm test -- -t "validates file size"

# Run in debug mode
npm test -- --inspect-brk

# View test output
npm test -- --reporter=verbose
```

### Coverage Gaps
```bash
# Generate coverage
npm run test:coverage

# Check uncovered lines
open coverage/lcov-report/index.html
```

### E2E Debugging
```bash
# Run with browser visible
npm run test:e2e:headed

# Debug mode with DevTools
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

## CI/CD Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Pull requests (GitHub Actions)
- Before deployment

### Pre-commit Hook
```bash
# .git/hooks/pre-commit
npm test && npm run lint
```

### GitHub Actions
```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    npm test -- --coverage --ci
    npm run test:e2e
```

## File Upload Tests

Comprehensive test suite for multi-file upload feature:

**Location**: `tests/hooks/use-multi-file-upload.test.ts`, `tests/components/file/`

**Coverage**: 118 tests covering:
- File validation (PDF only, 200MB max)
- Queue management (max 30 files)
- Concurrent uploads (max 3)
- Retry logic (max 3 attempts)
- Progress tracking
- Error handling
- Accessibility

**Run Upload Tests**:
```bash
npm test -- tests/hooks/use-multi-file-upload.test.ts
npm test -- tests/components/file/
```

See [TEST_PLAN.md](../docs/TEST_PLAN.md) for detailed documentation.

## Resources

- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro)
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [TDD Guide](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Getting Help

**Common Issues**:
- Check `tests/setup.ts` for global mocks
- Verify environment variables are set
- Clear test cache: `npm test -- --clearCache`
- Check for async timing issues with `waitFor`

**Questions**: Check project documentation in `docs/` or ask the team.
